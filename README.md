# Travel

Die Lieblingsorte der Familie DJNP: Lokale, Bars, Hotels, Strände, Konzerte und Spezialitäten – nur das, was uns gefallen hat. Mit Straßenkarte, Suche, Hundetauglichkeit, Reisen, Reisebuch und Teilen per WhatsApp.

- Die App ist eine Web-App: am Handy im Browser öffnen und zum Startbildschirm hinzufügen.
- Anmeldung mit demselben Zugang wie bei DJNP. Die Daten liegen in derselben Supabase-Datenbank, aber in eigenen Tabellen (`travel_*`) und im eigenen Fotospeicher `travel` (`datenbank/travel-setup.sql`).
- `config.js` enthält nur den öffentlichen Schlüssel. Er gibt ohne Anmeldung keinen Zugriff auf Daten.
- Karte: © OpenStreetMap-Mitwirkende. Ortssuche: Nominatim (OpenStreetMap).
