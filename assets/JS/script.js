// SportsHub — Week Project Settimana VII
//
// Devi fare 4 cose per la Versione Base:
// 1. Definire le classi Squadra ed Evento (mappano i dati di TheSportsDB)
// 2. Funzione async cercaSquadre(query) che chiama /searchteams.php
// 3. Funzione async caricaDettagli(idTeam) che chiama in parallelo
//    eventsnext.php + eventslast.php usando Promise.all
// 4. Render dinamico: card squadre, lista prossimi eventi, lista risultati
//
// Endpoint base: https://www.thesportsdb.com/api/v1/json/3/
// Il `3` nell'URL è la chiave API pubblica di test di TheSportsDB: gratis, non serve registrarsi.
//
// Per le versioni Intermedia/Avanzata: localStorage preferiti, debounce, Promise.all multi.

const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

// === Classi ===

class Squadra {
    constructor(data) {
        this.idTeam = data.idTeam;
        this.strTeam = data.strTeam;
        this.strBadge = data.strBadge;
        this.strLeague = data.strLeague;
        this.strCountry = data.strCountry;
    }
}

class Evento {
    constructor(data) {
        this.idEvent = data.idEvent;
        this.dateEvent = data.dateEvent;
        this.strHomeTeam = data.strHomeTeam;
        this.strAwayTeam = data.strAwayTeam;
        this.intHomeScore = data.intHomeScore;
        this.intAwayScore = data.intAwayScore;
    }
    /* Unisco i nomi delle squadre in una stringa */

    getAccoppiamento() {
        return `${this.strHomeTeam} vs ${this.strAwayTeam}`;
    }

    /* Formatto punteggio */

    getPunteggioFormattato() {
        if (this.intHomeScore !== null && this.intAwayScore !== null) {
            return `${this.intHomeScore} – ${this.intAwayScore}`;
        }
        return "";
    }

    /* Formatto la data */

    getDataFormattata() {
        if (!this.dateEvent) return "";
        const [anno, mese, giorno] = this.dateEvent.split("-");
        return `${giorno}/${mese}/${anno}`;
    }
}

// === API ===

/* Fetch, chiamata API */

async function cercaSquadre(query) {
    mostraSpinner();
    nascondiErrore();
    try {
        const response = await fetch(`${BASE_URL}/searchteams.php?t=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        nascondiSpinner();
        if (!data.teams) {
            mostraErrore("Nessuna squadra trovata con questo nome.");
            return [];
        }
        return data.teams.map(t => new Squadra(t));
    } catch (error) {
        nascondiSpinner();
        mostraErrore("Si è verificato un problema di rete.");
        return [];
    }
}

async function caricaDettagli(idTeam) {
    mostraSpinnerDettagli();
    try {
        const [resProssimi, resUltimi] = await Promise.all([
            fetch(`${BASE_URL}/eventsnext.php?id=${idTeam}`).then(r => r.json()),
            fetch(`${BASE_URL}/eventslast.php?id=${idTeam}`).then(r => r.json())
        ]);
        return {
            prossimi: (resProssimi.events || []).map(e => new Evento(e)),
            ultimi: (resUltimi.results || []).map(e => new Evento(e))
        };
    } catch (error) {
        return { prossimi: [], ultimi: [] };
    } finally {
        nascondiSpinnerDettagli();
    }
}

// === Stato ===

/* Local Storage */

const stato = {
    preferiti: JSON.parse(localStorage.getItem("sportsHub_preferiti")) || [],
    debounceTimer: null
};

// === Render ===

function renderizzaSquadre(squadre, containerId, isPreferiti = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (squadre.length === 0) {
        if (isPreferiti) {
            container.innerHTML = `<p class="placeholder-text">Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.</p>`;
        } else {
            container.innerHTML = `<p class="placeholder-text">Inizia cercando una squadra qui sopra.</p>`;
        }
        return;
    }

    squadre.forEach(squadra => {
        const colonna = document.createElement("div");
        colonna.className = "col";

        const isGiaPreferito = stato.preferiti.some(p => p.idTeam === squadra.idTeam);
        let testoBottone = isGiaPreferito ? "✓ Già nei preferiti" : "⭐ Aggiungi ai preferiti";
        let classeBottone = isGiaPreferito ? "btn-preferito btn-gia-preferito" : "btn-preferito btn-aggiungi";


        if (isPreferiti) {
            testoBottone = "🗑️ Rimuovi";
            classeBottone = "btn-preferito btn-rimuovi";
        }

        colonna.innerHTML = `
      <div class="team-card">
        <div class="team-clickable-zone">
          <img src="${squadra.strBadge || 'https://via.placeholder.com/150'}" alt="${squadra.strTeam}" class="team-logo">
          <h3 class="h5 mb-1 fw-bold">${squadra.strTeam}</h3>
          <p class="team-info">${squadra.strLeague}</p>
          <p class="team-country">${squadra.strCountry}</p>
        </div>
        <button class="${classeBottone}" data-id="${squadra.idTeam}">${testoBottone}</button>
      </div>
    `;

        colonna.querySelector(".team-clickable-zone").addEventListener("click", () => gestisciClickSquadra(squadra));
        colonna.querySelector(".btn-preferito").addEventListener("click", (e) => {
            e.stopPropagation();
            gestisciPreferito(squadra);
        });

        container.appendChild(colonna);
    });
}

/* Rimuovo hidden e recupero dati */

async function gestisciClickSquadra(squadra) {
    const dettagliSection = document.getElementById("dettagli-section");
    dettagliSection.removeAttribute("hidden");
    dettagliSection.scrollIntoView({ behavior: "smooth" });

    document.getElementById("nome-squadra-dettaglio").textContent = squadra.strTeam;
    const { prossimi, ultimi } = await caricaDettagli(squadra.idTeam);

    document.getElementById("prossimi-eventi-lista").innerHTML = prossimi.length
        ? prossimi.map(e => `
        <div class="event-card">
          <div class="event-date">${e.getDataFormattata()}</div>
          <div class="event-matchup"><span>${e.getAccoppiamento()}</span></div>
        </div>
      `).join("")
        : "<p class='text-muted small italic mt-2'>Nessun evento in programma</p>";

    document.getElementById("ultimi-risultati-lista").innerHTML = ultimi.length
        ? ultimi.map(e => `
        <div class="event-card">
          <div class="event-date">${e.getDataFormattata()}</div>
          <div class="event-matchup">
            <span>${e.strHomeTeam} vs ${e.strAwayTeam}</span> 
            <span class="event-score">${e.getPunteggioFormattato()}</span>
          </div>
        </div>
      `).join("")
        : "<p class='text-muted small italic mt-2'>Nessun risultato recente disponibile.</p>";
}

/* Gestione squadre preferite */

/* Gestione squadre preferite */

function gestisciPreferito(squadra) {
    // TROVATO: Se clicco sul pulsante grigio direttamente nella griglia di ricerca, non fare nulla
    const grigliaRicerca = document.getElementById("risultati-grid");
    const bottoneRicercaEsistente = grigliaRicerca ? grigliaRicerca.querySelector(`[data-id="${squadra.idTeam}"]`) : null;
    
    const isGiaPreferitoPrimaDelClick = stato.preferiti.some(p => p.idTeam === squadra.idTeam);
    
    // Se la squadra è già nei preferiti E l'utente ha cliccato sul bottone dentro la ricerca, blocca l'azione
    if (isGiaPreferitoPrimaDelClick && bottoneRicercaEsistente && event && event.target === bottoneRicercaEsistente) {
        return; 
    }

    // 1. Modifica l'array nello stato (Aggiungi o Rimuovi)
    const index = stato.preferiti.findIndex(p => p.idTeam === squadra.idTeam);
    if (index > -1) {
        stato.preferiti.splice(index, 1);
    } else {
        stato.preferiti.push(squadra);
    }
    
    // 2. Salva i dati aggiornati nel browser
    localStorage.setItem("sportsHub_preferiti", JSON.stringify(stato.preferiti));

    // 3. Ridisegna da zero la sezione dei preferiti in alto
    renderizzaSquadre(stato.preferiti, "preferiti-grid", true);

    // 4. Aggiorna solo il bottone dentro i risultati di ricerca se esiste
    if (grigliaRicerca) {
        const bottoniRicerca = grigliaRicerca.querySelectorAll(`[data-id="${squadra.idTeam}"]`);
        bottoniRicerca.forEach(bottone => {
            const isGiaPreferito = stato.preferiti.some(p => p.idTeam === squadra.idTeam);
            bottone.textContent = isGiaPreferito ? "✓ Già nei preferiti" : "⭐ Aggiungi ai preferiti";
            bottone.className = isGiaPreferito ? "btn-preferito btn-gia-preferito" : "btn-preferito btn-aggiungi";
        });
    }
}

function mostraSpinner() { document.getElementById("spinner").style.display = "block"; }
function nascondiSpinner() { document.getElementById("spinner").style.display = "none"; }
function mostraSpinnerDettagli() { document.getElementById("spinner-dettagli").style.display = "block"; }
function nascondiSpinnerDettagli() { document.getElementById("spinner-dettagli").style.display = "none"; }
function mostraErrore(msg) { const err = document.getElementById("error-message"); err.textContent = msg; err.style.display = "block"; }
function nascondiErrore() { document.getElementById("error-message").style.display = "none"; }






document.addEventListener("DOMContentLoaded", () => {
    const inputRicerca = document.querySelector(".search-input");
    const formRicerca = document.querySelector(".search-form");


    if (stato.preferiti.length > 0) {
        renderizzaSquadre(stato.preferiti, "preferiti-grid", true);
    }

    formRicerca.addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = inputRicerca.value.trim();

        document.getElementById("risultati-grid").innerHTML = "";


        if (query.length > 1) {
            const risultati = await cercaSquadre(query);
            renderizzaSquadre(risultati, "risultati-grid", false);
        } else {

            renderizzaSquadre([], "risultati-grid", false);
        }
    });

});