Haluan lisätä nykyiseen HTML + Vanilla JavaScript + CSS -pohjaiseen Idea Generator -projektiin sääntöpohjaisen "smart generation" -toiminnon ilman LLM:ää.

Älä tee kaikkea kerralla. Toteuta ominaisuus vaiheittain niin, että nykyinen generaattori toimii koko ajan.

Tavoite:
Generaattori ei vain arvo täysin satunnaisia yhdistelmiä, vaan pystyy arvioimaan niiden kiinnostavuutta kolmen päätekijän avulla:

1. Synergy
2. Tension
3. Novelty / Genericness

Lisäksi saa olla pieni Compatibility / Conflict -rangaistus selvästi huonoille yhdistelmille.

Ensimmäisessä versiossa ÄLÄ lisää metadataa kaikkiin generaattorin kategorioihin.

Aloita vain näistä:
- Genre
- Setting
- Core mechanic
- Mood
- Twist

Nykyisten JSON-listojen pitää edelleen toimia.

## Vaihe 1 — metadata

Lisää näiden viiden kategorian vaihtoehtoihin kevyt metadata.

Esimerkki:

```json
{
  "id": "football-manager",
  "name": "Football Manager",
  "tags": [
    "management",
    "people",
    "statistics",
    "competition"
  ],
  "contrasts": [
    "cyberspace",
    "mythology"
  ],
  "commonness": 0.55
}
```

Metadata:

- `tags`
  - kuvaa elementin keskeisiä ominaisuuksia
  - noin 2–5 tagia per vaihtoehto
- `contrasts`
  - tagit, joiden kanssa elementti muodostaa kiinnostavan epätavallisen yhdistelmän
  - ei tarkoita huonoa yhdistelmää
- `commonness`
  - 0.0 = erittäin epätavallinen
  - 1.0 = erittäin tavallinen

Älä tee valtavaa ontologiaa.

Käytä mielellään noin 30–50 yhteistä tagia koko järjestelmässä.

Esimerkkejä tageista:

```text
management
people
combat
exploration
mystery
information
economy
survival
social
politics
technology
cyberspace
nature
history
mythology
horror
cozy
competition
strategy
automation
investigation
narrative
stealth
construction
simulation
```

Pidä tagien nimet englanniksi riippumatta käyttöliittymän kielestä.

## Vaihe 2 — scoring engine

Tee uusi moduuli esimerkiksi:

```text
js/scoring.js
```

Sen pitää pystyä arvioimaan yksi generoitu idea.

Palauta esimerkiksi:

```js
{
    synergy: 72,
    tension: 61,
    novelty: 84,
    conflict: 8,
    total: 76
}
```

Kaikki arvot välille 0–100.

### Synergy

Synergy kasvaa, jos eri elementeillä on samoja tai toisiaan tukevia tageja.

Esimerkiksi:

Football Manager:
- management
- people

Tracking People:
- people
- information
- management

=> korkea synergy

Genre ↔ Core mechanic saa olla tärkeämpi kuin esimerkiksi Mood ↔ Twist.

Käytä painotettuja pareja.

Esimerkiksi:

```js
genre-mechanic: 3
genre-setting: 1
genre-mood: 1
setting-twist: 2
mechanic-twist: 2
mechanic-mood: 1
```

Ei tarvitse verrata jokaista kaikkeen.

## Vaihe 3 — tension

Tension tarkoittaa kiinnostavaa kitkaa.

Esimerkki:

Football Manager + Computer Network

Ne eivät luonnostaan kuulu yhteen, mutta yhdistelmä ei ole mahdoton.

Jos toisen elementin `contrasts` osuu toisen elementin tageihin, lisää tension-pisteitä.

Esimerkiksi:

Football Manager:

```json
"contrasts": ["cyberspace", "mythology"]
```

Computer Network:

```json
"tags": ["cyberspace", "technology", "systems"]
```

=> tension kasvaa.

Tension ei ole virhe.

Hyvä idea voi sisältää melko korkean tension-arvon.

## Vaihe 4 — novelty

Novelty kasvaa, kun mukana on harvinaisia elementtejä ja epätavallisia yhdistelmiä.

Käytä ensisijaisesti `commonness`-arvoja.

Esimerkiksi:

```js
novelty = 1 - averageCommonness
```

Myöhemmin voidaan lisätä erillisiä yleisten parien sääntöjä, mutta älä tee niitä vielä ensimmäisessä versiossa.

## Vaihe 5 — conflict

Lisää tarvittaessa pieni `conflicts`-metadata vain sellaisiin elementteihin, joissa todella on selvä ristiriita.

Esimerkiksi:

```json
"conflicts": ["permadeath"]
```

jos kyseessä on erittäin rento ja riskitön pelirakenne.

Älä käytä conflictia liikaa.

Conflict tarkoittaa oikeaa suunnittelullista ristiriitaa, ei vain epätavallista yhdistelmää.

## Vaihe 6 — kokonaispiste

Laske alustavasti:

```js
total =
    synergy * 0.35 +
    tension * 0.30 +
    novelty * 0.35 -
    conflict * 0.50;
```

Clamp välille 0–100.

Tämä ei ole lopullinen kaava. Tee painotukset helposti muutettaviksi yhdestä config-objektista.

## Vaihe 7 — Smart Roll

Lisää tavallisen Roll-toiminnon rinnalle uusi nappi:

```text
🔥 Etsi kiinnostavampi yhdistelmä
```

Kun sitä painetaan:

1. Pidä kaikki käyttäjän lukitsemat kentät ennallaan.
2. Generoi esimerkiksi 300–1000 satunnaista kandidaattia.
3. Arvioi jokainen `scoring.js`:llä.
4. Näytä paras tai yksi parhaista.

Älä aina valitse absoluuttisesti korkeinta tulosta, jotta tulokset eivät ala toistaa itseään.

Esimerkiksi:
- ota 10 parasta kandidaattia
- valitse niistä satunnaisesti yksi

## Vaihe 8 — arvio näkyviin

Näytä tuloksen yhteydessä kevyt arvio:

```text
Synergy       74
Tension       63
Novelty       82
Interesting   77
```

Älä tee vielä isoja graafeja.

Pienet progress barit tai numerot riittävät.

## Vaihe 9 — selitykset ilman AI:ta

Generoi 1–3 yksinkertaista template-pohjaista selitystä.

Esimerkiksi:

```text
Football Manager ja Henkilöiden seuraaminen tukevat molemmat managerointia.

Football Manager ja Tietokoneverkko muodostavat epätavallisen yhdistelmän.

Kokonaisuus käyttää useita harvinaisia elementtejä, joten geneerisyys on matala.
```

Älä yritä kirjoittaa ihmismäistä pitkää analyysiä.

Tavoite on vain näyttää käyttäjälle, miksi pisteet syntyivät.

## Arkkitehtuuri

Pidä scoring täysin erillään käyttöliittymästä.

Esimerkiksi:

```text
js/
    generator.js
    scoring.js
    smartRoll.js
    ui.js
```

`scoring.js` ei saa manipuloida DOMia.

Sen pitäisi olla mahdollista testata näin:

```js
const result = scoreIdea(idea);
console.log(result);
```

## Tärkeä rajaus

Ensimmäisen toteutuksen jälkeen pysähdy.

Älä ala lisäämään metadataa kaikkiin nykyisiin 15–20 kategoriaan.

Kun Genre + Setting + Core mechanic + Mood + Twist toimivat, ominaisuutta voidaan testata ja painotuksia säätää ennen laajentamista.

## Valmis ensimmäinen versio tarkoittaa

- nykyinen tavallinen Roll toimii edelleen
- lukitus toimii edelleen
- viisi tärkeintä kenttää sisältävät metadataa
- scoring engine toimii
- Smart Roll toimii
- lukitut kentät huomioidaan
- pisteet näkyvät käyttöliittymässä
- tuloksesta tulee muutama sääntöpohjainen selitys
- mitään LLM/API-kutsuja ei käytetä