import { useState } from "react";
import { eventIntact, type HistEvent } from "@/data/events";
import type { SimInput } from "@/data/types";

export function EventLibrary({ events, onLoad }: { events: HistEvent[]; onLoad: (id: string) => void }) {
  const [id, setId] = useState(events[0]?.id ?? "");
  const event = events.find((e) => e.id === id) ?? events[0];
  if (!event) return null;
  return (
    <div className="workspace casi">
      <section className="scroll-col left">
        <p className="meta">Casi documentati</p>
        <p className="note">
          Dodici perdite o catture legate ai battelli di questo archivio. Si richiama il colpo solo quando un rapporto dice l’arma. Lo scarto in metri, quasi sempre, non c’è.
        </p>
        {events.map((e) => (
          <button key={e.id} type="button" className="hist" data-on={event.id === e.id} onClick={() => setId(e.id)}>
            <strong>
              {e.date} · {e.boat}
            </strong>
            <small>
              {e.recreable ? "Ipotesi richiamabile" : "Fuori dalle cariche di questo studio"} · {e.attacker}
            </small>
          </button>
        ))}
      </section>
      <section className="scroll-col">
        <EventCard event={event} onLoad={onLoad} />
      </section>
    </div>
  );
}

export function EventCard({
  event,
  input,
  onLoad,
}: {
  event: HistEvent;
  input?: SimInput;
  onLoad?: (id: string) => void;
}) {
  const intact = input ? eventIntact(event, input) : false;
  return (
    <article className="event-card">
      <p className="meta">{onLoad ? "Scheda" : "Caso richiamato"}</p>
      <h3>
        {event.boat} · {event.date}
      </h3>
      <p>
        {event.klass}. {event.place}. {event.attacker}.
      </p>
      <p>{event.result}</p>
      {!event.recreable && <p>{event.whyNot}</p>}
      {input && event.recreable && (
        <p className="note">{intact ? "I comandi sono ancora l’ipotesi di questa scheda." : "Hai mosso i comandi: non è più l’ipotesi di partenza."}</p>
      )}
      <p className="meta">Documentato</p>
      <ul>
        {event.known.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      {event.assumed.length > 0 && (
        <>
          <p className="meta">Ipotesi del modello</p>
          <ul>
            {event.assumed.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </>
      )}
      <p className="meta">Fonti</p>
      <ul>
        {event.sources.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      {onLoad && (
        <button type="button" className="preset" onClick={() => onLoad(event.id)}>
          {event.recreable ? "Ricostruisci nello studio" : "Apri il battello, senza il colpo"}
        </button>
      )}
    </article>
  );
}
