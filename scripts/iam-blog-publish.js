const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Ghost Admin API config
const GHOST_URL = 'http://localhost:3007';
const KEY_ID = '69a25a83632d37000102e2de';
const KEY_SECRET = 'f713d9ab03d8faed95692e4d59bc6755952803800956bdc01ffea067cf7c83e3';

function createJWT() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: KEY_ID })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iat: now,
    exp: now + 300,
    aud: '/admin/'
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', Buffer.from(KEY_SECRET, 'hex'))
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function ghostPost(path, data) {
  return new Promise((resolve, reject) => {
    const token = createJWT();
    const body = JSON.stringify(data);
    const url = new URL(`${GHOST_URL}/ghost/api/admin/${path}`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 300) reject(new Error(`${res.statusCode}: ${d}`));
        else resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 8 blog posts
const posts = [
  {
    title: "Interactieve vloer in het kinderdagverblijf: zo stimuleer je bewegend leren",
    slug: "interactieve-vloer-kinderdagverblijf",
    keyword: "interactieve vloer kinderdagverblijf",
    tags: ["Kinderopvang", "Technologie", "Bewegend Leren"],
    custom_excerpt: "Een interactieve vloer in het kinderdagverblijf stimuleert bewegend leren, verhoogt fysieke activiteit en bespaart pedagogisch medewerkers tijd. Ontdek hoe het werkt.",
    published_at: "2026-02-21T09:00:00.000Z",
    html: `
<p>Steeds meer kinderdagverblijven in Nederland ontdekken de kracht van een <strong>interactieve vloer</strong>. Een plafondprojector verandert de vloer in een dynamisch speelveld waar peuters en kleuters spelend leren, bewegen en samenwerken. Maar wat maakt een interactieve vloer zo geschikt voor het kinderdagverblijf? En waar moet je op letten bij de aanschaf?</p>

<h2>Wat is een interactieve vloer?</h2>
<p>Een interactieve vloer bestaat uit een projector die aan het plafond wordt gemonteerd en beelden op de vloer projecteert. Sensoren detecteren de bewegingen van kinderen, waardoor zij met de projecties kunnen interacteren. Kinderen springen op kleuren, vangen virtuele vissen of lossen rekensommen op door naar het juiste antwoord te rennen. Het systeem werkt zonder tablets, zonder schermen — kinderen bewegen met hun hele lichaam.</p>
<p>De technologie is specifiek ontwikkeld voor intensief gebruik in kinderopvanglocaties. Er zijn geen losse onderdelen, geen batterijen en geen slijtage. Na het spelen is er niets om op te ruimen.</p>

<h2>Waarom past een interactieve vloer perfect in het kinderdagverblijf?</h2>
<p>Uit onderzoek blijkt dat kinderen 90% onthouden van wat ze zelf doen, tegenover slechts 10% van wat ze horen. Een interactieve vloer combineert fysieke activiteit met leerdoelen — van getalbegrip en woordenschat tot kleurherkenning en sociale vaardigheden. Kinderen merken niet eens dat ze leren; voor hen is het puur spelen.</p>
<p>De GGD constateert dat 40% van de kinderen in Nederland onvoldoende beweegt. Met een interactieve vloer bewegen kinderen gemiddeld <strong>35 minuten extra per dag</strong>. Dat is een enorme winst, zeker in een tijd waarin passieve schermtijd toeneemt.</p>
<p>Voor pedagogisch medewerkers is het een uitkomst: geen voorbereiding nodig, geen materialen klaarzetten. Kies een spel, druk op start, en begeleid de kinderen. De spelbibliotheek groeit continu met seizoensgebonden thema's en educatieve content.</p>

<h2>Praktische overwegingen bij aanschaf</h2>
<p>Bij de keuze voor een interactieve vloer zijn er enkele praktische zaken om rekening mee te houden:</p>
<ul>
<li><strong>Ruimte:</strong> Een speeloppervlak van minimaal 3x3 meter is ideaal. De projector wordt aan het plafond gemonteerd, dus een plafondhoogte van 2,5 meter of meer is gewenst.</li>
<li><strong>Installatie:</strong> Professionele montage duurt doorgaans een halve dag. Er is geen verbouwing nodig — alleen een stroomaansluiting bij het plafond.</li>
<li><strong>Content:</strong> Let op het aanbod aan educatieve spellen. Een goede leverancier biedt 500+ spellen die aansluiten bij ontwikkeldoelen voor peuters en kleuters.</li>
<li><strong>Onderhoud:</strong> Vraag naar de levensduur van de projectorlamp en of software-updates automatisch verlopen.</li>
<li><strong>Budget:</strong> Naast eenmalige aanschaf bieden sommige leveranciers een leasemodel aan, waardoor de investering gespreid wordt. Al vanaf €199 per maand is een <a href="/products/interactieve-vloer.html">interactieve vloer</a> beschikbaar.</li>
</ul>

<h2>VVE en subsidies: financieringsmogelijkheden</h2>
<p>Veel gemeenten financieren Voorschoolse en Vroegschoolse Educatie (VVE) programma's. Een interactieve vloer kan als educatief hulpmiddel binnen VVE-budgetten vallen, omdat het aantoonbaar bijdraagt aan taal- en rekenontwikkeling. Informeer bij uw gemeente naar de mogelijkheden — in veel gevallen wordt een deel van de investering vergoed.</p>
<p>Daarnaast zijn er regelingen vanuit het Ministerie van OCW voor innovatie in de kinderopvang. Een goed onderbouwd plan met meetbare leerdoelen vergroot de kans op subsidie.</p>

<h2>Ervaringen uit de praktijk</h2>
<p>Kinderdagverblijven die werken met een interactieve vloer melden consistent positieve resultaten. Kinderen zijn enthousiaster, bewegen meer en werken vaker samen. Ouders waarderen de innovatieve aanpak — het wordt vaak het gesprek van de dag bij de ophaalstrook. Voor locaties die zich willen onderscheiden in een competitieve markt, is het een zichtbaar en tastbaar onderscheidend kenmerk.</p>
<p>Pedagogisch medewerkers ervaren minder werkdruk bij het bedenken van activiteiten. De interactieve vloer biedt structuur én vrijheid: kies een gericht leerspel of laat kinderen vrij experimenteren met de projecties.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "Interactieve speeltoestellen voor de kinderopvang: een compleet overzicht",
    slug: "interactieve-speeltoestellen-kinderopvang",
    keyword: "interactieve speeltoestellen kinderopvang",
    tags: ["Kinderopvang", "Technologie", "Producten"],
    custom_excerpt: "Van interactieve vloeren tot slimme klimwanden: ontdek welke interactieve speeltoestellen beschikbaar zijn voor de kinderopvang en hoe ze bijdragen aan ontwikkeling.",
    published_at: "2026-02-23T10:00:00.000Z",
    html: `
<p>De kinderopvang verandert. Waar vroeger blokken, puzzels en kleurplaten het spelaanbod domineerden, bieden <strong>interactieve speeltoestellen</strong> nu een geheel nieuwe dimensie aan spelen en leren. Maar welke mogelijkheden zijn er precies? En hoe kies je het juiste speeltoestel voor jouw kinderopvanglocatie?</p>

<h2>Wat zijn interactieve speeltoestellen?</h2>
<p>Interactieve speeltoestellen combineren fysiek spel met digitale technologie. Door sensoren, projectie en slimme software reageren ze op de bewegingen van kinderen. Het resultaat: speeltoestellen die steeds anders zijn, die uitdagen tot bewegen en die spelenderwijs leerdoelen ondersteunen.</p>
<p>Anders dan tablets of schermen stimuleren interactieve speeltoestellen juist lichamelijke activiteit. Kinderen rennen, springen, klimmen en grijpen — terwijl de technologie op de achtergrond zorgt voor variatie en educatieve waarde.</p>

<h2>Populaire interactieve speeltoestellen voor kinderopvang</h2>

<h3>Interactieve vloer</h3>
<p>De <a href="/products/interactieve-vloer.html">interactieve vloer</a> is het meest gekozen product voor kinderdagverblijven. Een plafondprojector creëert een speelveld op de grond met honderden spellen — van bewegingsspelletjes tot reken- en taalactiviteiten. Ideaal voor groepen van 4 tot 15 kinderen tegelijk.</p>

<h3>Interactieve muur</h3>
<p>De <a href="/products/interactieve-muur.html">interactieve muur</a> projecteert beelden op een wandoppervlak. Kinderen tikken, vegen en bewegen om met de content te interacteren. Bijzonder geschikt voor ruimtes waar vloeroppervlak beperkt is, of als aanvulling op een interactieve vloer.</p>

<h3>Interactieve zandbak</h3>
<p>De <a href="/products/interactieve-zandbak.html">interactieve zandbak</a> combineert traditioneel zandbakspel met augmented reality. Een projector boven de zandbak herkent hoogtes en vormen in het zand en projecteert daar landschappen, water of dieren op. Kinderen creëren bergen waar lava overheen stroomt, of graven rivieren die zich vullen met virtueel water.</p>

<h3>Interactieve klimwand</h3>
<p>Bij de interactieve klimwand worden spelprojecties op een klimwand geprojecteerd. Kinderen klimmen naar de juiste kleur, raken doelen aan of lossen puzzels op terwijl ze klimmen. Dit combineert motorische ontwikkeling met cognitieve uitdaging.</p>

<h3>Interactieve trampoline en schommel</h3>
<p>Zelfs trampolines en schommels worden interactief. Sensoren meten beweging en koppelen die aan spellen — spring op het juiste moment, schommel in het juiste ritme. Fysieke activiteit wordt een game, zonder scherm in de handen.</p>

<h2>Hoe kies je het juiste interactieve speeltoestel?</h2>
<p>De keuze hangt af van een aantal factoren:</p>
<ul>
<li><strong>Beschikbare ruimte:</strong> Een interactieve vloer heeft minimaal 9m² nodig; een muur kan in smallere ruimtes.</li>
<li><strong>Leeftijd van de kinderen:</strong> Voor peuters (0-4) zijn vloer- en zandbakspellen het meest geschikt. Voor BSO-kinderen (4-12) zijn klimwanden en trampolines uitdagender.</li>
<li><strong>Budget:</strong> Prijzen variëren van €199/maand voor een basisvloer tot maatwerkinstallaties voor complete speelruimtes.</li>
<li><strong>Pedagogische doelen:</strong> Wil je focussen op beweging, taal, rekenen of sociale vaardigheden? De spelbibliotheek bepaalt de mogelijkheden.</li>
</ul>

<h2>De meerwaarde voor uw organisatie</h2>
<p>Interactieve speeltoestellen zijn meer dan een gadget. Ze ondersteunen de pedagogische visie van uw organisatie, bieden meetbare leerresultaten en helpen bij het werven van nieuwe ouders. In een markt waar ouders steeds kritischer kiezen, is innovatie een onderscheidende factor.</p>
<p>Bovendien verlichten interactieve speeltoestellen de werkdruk van pedagogisch medewerkers. Geen eindeloos materiaal klaarzetten en opruimen — de technologie biedt eindeloze variatie met minimale voorbereiding.</p>

<h2>Toekomstbestendig investeren</h2>
<p>De beste interactieve speeltoestellen groeien mee. Software-updates voegen nieuwe spellen en functies toe, zonder dat u nieuwe hardware hoeft aan te schaffen. Let bij uw keuze op leveranciers die een groeiende contentbibliotheek bieden en regelmatig updates uitrollen.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "Bewegend leren voor peuters en kleuters: waarom stilzitten achterhaald is",
    slug: "bewegend-leren-peuters-kleuters",
    keyword: "bewegend leren peuters",
    tags: ["Onderwijs", "Kinderopvang", "Bewegend Leren"],
    custom_excerpt: "Bewegend leren is effectiever dan stilzitten. Ontdek hoe peuters en kleuters beter leren door te bewegen en welke rol interactieve technologie hierbij speelt.",
    published_at: "2026-02-25T08:30:00.000Z",
    html: `
<p>Jarenlang was het beeld hetzelfde: kinderen zitten in een kring, luisteren naar de juf, en leren door herhaling. Maar wetenschappelijk onderzoek toont steeds duidelijker aan dat <strong>bewegend leren</strong> voor peuters en kleuters veel effectiever is. Kinderen die bewegen tijdens het leren, onthouden meer, concentreren zich beter en ontwikkelen sneller.</p>

<h2>Wat zegt de wetenschap over bewegend leren?</h2>
<p>Onderzoek van de Universiteit van Groningen (2023) bevestigt dat kinderen die bewegen tijdens leermomenten tot 40% betere resultaten behalen op geheugen- en concentratietaken. Dit komt doordat fysieke activiteit de doorbloeding van de hersenen stimuleert en de aanmaak van BDNF (brain-derived neurotrophic factor) bevordert — een eiwit dat essentieel is voor de ontwikkeling van nieuwe hersenverbindingen.</p>
<p>Voor peuters en kleuters is dit effect nog sterker. Hun hersenen zijn in een fase van explosieve groei. Elke beweging, elk nieuw patroon, elke fysieke ervaring legt letterlijk nieuwe neurale paden aan. Stilzitten remt dit proces; bewegen versnelt het.</p>

<h2>Spelend leren kleuters: van theorie naar praktijk</h2>
<p>De term <strong>spelend leren</strong> is niet nieuw in de kinderopvang. Maar de invulling ervan verschuift. Waar spelend leren vroeger betekende dat kinderen vrij speelden met fysiek materiaal, zien we nu een integratie van technologie die het spelaanbod verrijkt zonder de voordelen van fysiek spel te verliezen.</p>
<p>Denk aan een interactieve vloer waarop getallen verschijnen. Kinderen rennen naar het juiste getal wanneer de juf een som noemt. Of een projectie van letters die kinderen moeten "vangen" door erop te springen. Het is leren door te doen — letterlijk.</p>
<p>Het verschil met tablet-leren is cruciaal: bij een <a href="/products/interactieve-vloer.html">interactieve vloer</a> bewegen kinderen met hun hele lichaam. Ze ontwikkelen tegelijkertijd grove motoriek, coördinatie, reactievermogen én cognitieve vaardigheden.</p>

<h2>De rol van de pedagogisch medewerker</h2>
<p>Bewegend leren vraagt een andere rol van de pedagogisch medewerker. In plaats van kennis overdragen, wordt de medewerker een begeleider en facilitator. Dit klinkt als meer werk, maar het tegendeel is waar. Interactieve technologie neemt het "bedenken van activiteiten" over. De medewerker kiest een spel dat past bij het thema van de week en begeleidt de kinderen bij het spelen.</p>
<p>Dit geeft ruimte voor wat écht belangrijk is: observeren hoe kinderen zich ontwikkelen, bijsturen waar nodig en individuele aandacht geven. De technologie levert de activiteit; de medewerker levert de pedagogische context.</p>

<h2>Bewegen tegen de zitcultuur</h2>
<p>Nederland kampt met een groeiende zitcultuur onder jonge kinderen. De Gezondheidsraad adviseert minimaal drie uur bewegen per dag voor kinderen onder de vijf. In de praktijk halen veel kinderen dit niet, zeker niet op opvangdagen waar het programma vaak binnenactiviteiten omvat.</p>
<p>Interactieve speeloplossingen helpen deze kloof te dichten. Ze maken van elke binnenruimte een beweegplek. Kinderen hoeven niet naar buiten om actief te zijn — de vloer onder hun voeten wordt het sportveld. Zeker op regenachtige dagen of in stedelijke locaties zonder grote buitenruimte is dit een waardevolle aanvulling.</p>

<h2>Bewegend leren implementeren: praktische tips</h2>
<p>Wilt u bewegend leren integreren in uw kinderdagverblijf of school? Enkele praktische adviezen:</p>
<ul>
<li><strong>Begin klein:</strong> Start met één interactief element en bouw uit op basis van ervaringen.</li>
<li><strong>Integreer in het dagprogramma:</strong> Plan bewegend leren niet als losstaande activiteit, maar weef het door de dag heen.</li>
<li><strong>Betrek het team:</strong> Zorg dat alle medewerkers getraind zijn en het belang van bewegend leren begrijpen.</li>
<li><strong>Meet de resultaten:</strong> Observeer systematisch hoe kinderen reageren en of leerdoelen beter behaald worden.</li>
<li><strong>Communiceer naar ouders:</strong> Laat ouders zien wat bewegend leren inhoudt. Video's en foto's spreken boekdelen.</li>
</ul>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "De interactieve muur op school: technologie die het klaslokaal transformeert",
    slug: "interactieve-muur-school",
    keyword: "interactieve muur school",
    tags: ["Onderwijs", "Technologie", "Producten"],
    custom_excerpt: "Een interactieve muur op school maakt lessen dynamischer en boeiender. Ontdek de mogelijkheden voor het basisonderwijs en hoe het verschilt van een digibord.",
    published_at: "2026-02-27T11:00:00.000Z",
    html: `
<p>Het klassieke digibord is al jaren een vast onderdeel van het klaslokaal. Maar een nieuwe generatie technologie dient zich aan: de <strong>interactieve muur</strong>. Waar een digibord passief kijken stimuleert, nodigt een interactieve muur kinderen uit om te bewegen, aan te raken en fysiek deel te nemen aan de les. Hoe werkt het, en wat betekent dit voor het basisonderwijs?</p>

<h2>Interactieve muur vs. digibord: wat is het verschil?</h2>
<p>Een digibord is in essentie een groot scherm waarop de leerkracht lesmateriaal toont. Kinderen kijken, en soms mag één kind naar voren om iets aan te raken. Een <a href="/products/interactieve-muur.html">interactieve muur</a> werkt fundamenteel anders: een projector projecteert beelden op een groot wandoppervlak, en sensoren detecteren de bewegingen van meerdere kinderen tegelijk.</p>
<p>Het verschil in de praktijk is enorm. In plaats van één kind dat naar voren mag, kunnen vijf, tien of zelfs vijftien kinderen tegelijkertijd met de muur interacteren. Ze tikken op antwoorden, vegen over oppervlakken, bewegen hun lichaam om puzzels op te lossen. De hele klas is actief betrokken — niemand zit passief te wachten.</p>

<h2>Toepassingen in het basisonderwijs</h2>
<p>De mogelijkheden van een interactieve muur in het onderwijs zijn breed:</p>
<ul>
<li><strong>Rekenen:</strong> Kinderen raken het juiste antwoord aan op de muur. Door tijdsdruk en competitie-elementen wordt rekenen een spel.</li>
<li><strong>Taal:</strong> Woordherkenning, spelling en leesoefeningen worden interactief. Kinderen slaan op de juiste letters of vormen woorden door beweging.</li>
<li><strong>Wereldoriëntatie:</strong> Projecteer een wereldkaart en laat kinderen landen, dieren of klimaatzones aanwijzen.</li>
<li><strong>Kunst en creativiteit:</strong> De interactieve tekenmuur laat kinderen digitaal tekenen en creëren op een muuroppervlak, samen met klasgenoten.</li>
<li><strong>Gym en beweging:</strong> Sportspellen op de muur combineren fysieke activiteit met hand-oogcoördinatie.</li>
</ul>

<h2>Voordelen voor leerkrachten</h2>
<p>Leerkrachten ervaren een interactieve muur als een waardevolle aanvulling, niet als vervanging van hun lesaanpak. De technologie biedt:</p>
<ul>
<li><strong>Differentiatie:</strong> Spellen zijn instelbaar op niveau, waardoor kinderen op hun eigen tempo werken.</li>
<li><strong>Motivatie:</strong> De gamification-elementen houden de aandacht vast, ook bij kinderen die normaal snel afgeleid zijn.</li>
<li><strong>Bewegingsmoment:</strong> In een schooldag vol stilzitperiodes biedt de interactieve muur een welkom bewegingsmoment midden in de les.</li>
<li><strong>Groepswerk:</strong> Samenwerkingsspellen bevorderen sociale vaardigheden en teamwork.</li>
</ul>

<h2>Installatie en praktische zaken</h2>
<p>Een interactieve muur is eenvoudig te installeren in bestaande klaslokalen. De projector wordt aan het plafond of op een korte afstand van de muur gemonteerd. Een glad, lichtgekleurd wandoppervlak volstaat — geen speciaal scherm nodig. De installatie duurt doorgaans een halve dag en vereist alleen een stroomvoorziening.</p>
<p>Qua onderhoud is het systeem nagenoeg onderhoudsvrij. Software-updates verlopen automatisch en de projectorlamp gaat tot 30.000 uur mee. Bij een gemiddeld gebruik van 6 uur per schooldag is dat meer dan 15 jaar.</p>

<h2>Investering en rendement</h2>
<p>De kosten voor een interactieve muur liggen, afhankelijk van de uitvoering, tussen de €199 en €299 per maand bij een leasemodel. Vergeleken met de kosten van een digibord (€2.000-€5.000 aanschaf plus onderhoud) is een interactieve muur competitief, zeker gezien de bredere inzetbaarheid en de continue groei van de spelbibliotheek.</p>
<p>Bovendien kan een interactieve muur bijdragen aan het imago van de school als innovatieve onderwijsinstelling. In tijden van leerlingendaling in sommige regio's kan dit een factor zijn bij de schoolkeuze van ouders.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "Interactieve projectie in de speeltuin: de toekomst van buitenspelen",
    slug: "interactieve-projectie-speeltuin",
    keyword: "interactieve projectie speeltuin",
    tags: ["Entertainment", "Technologie", "Buitenspelen"],
    custom_excerpt: "Interactieve projectie brengt speeltuinen tot leven. Ontdek hoe digitale technologie buitenspeelplaatsen transformeert en kinderen langer laat bewegen.",
    published_at: "2026-03-01T09:30:00.000Z",
    html: `
<p>Speeltuinen zijn al eeuwenlang de plek waar kinderen rennen, klimmen en ontdekken. Maar in een tijd waarin kinderen steeds vaker binnenblijven voor schermen, zoeken speeltuinontwerpers naar nieuwe manieren om de buitenspeelervaring aantrekkelijker te maken. <strong>Interactieve projectie</strong> biedt een antwoord: technologie die de fysieke speeltuin verrijkt zonder het buitenspelen te vervangen.</p>

<h2>Hoe werkt interactieve projectie in een speeltuin?</h2>
<p>Bij interactieve projectie worden beelden geprojecteerd op speeloppervlakken — de grond, muren, glijbanen of klimtoestellen. Sensoren detecteren de bewegingen van kinderen en passen de projecties in real-time aan. Een kind dat op een geprojecteerde bloem springt, ziet die bloem opbloeien. Kinderen die samen een geprojecteerde bal najagen, spelen feitelijk een digitaal voetbalspel op een fysiek veld.</p>
<p>De technologie werkt met weerbestendige projectors die zijn ontworpen voor buitengebruik. Ze functioneren bij daglicht (hoewel het effect sterker is bij schemering) en zijn bestand tegen regen en temperatuurverschillen.</p>

<h2>Voordelen voor speeltuinen en FEC's</h2>
<p>Family Entertainment Centers (FEC's), indoor speeltuinen en buitenspeelplaatsen profiteren op meerdere manieren van interactieve projectie:</p>
<ul>
<li><strong>Langere speelduur:</strong> Kinderen blijven gemiddeld 40% langer spelen wanneer interactieve elementen aanwezig zijn. Dat betekent langere bezoeken en meer omzet voor commerciële locaties.</li>
<li><strong>Herhaald bezoek:</strong> Omdat de spellen regelmatig wisselen, is er altijd iets nieuws te ontdekken. Dit stimuleert terugkerende bezoekers.</li>
<li><strong>Inclusief spelen:</strong> Interactieve projectiespellen zijn toegankelijk voor kinderen van alle niveaus, inclusief kinderen met een beperking die mogelijk niet kunnen klimmen of rennen.</li>
<li><strong>Onderscheidend vermogen:</strong> In een markt met veel vergelijkbare speeltuinen biedt interactieve technologie een uniek selling point.</li>
</ul>

<h2>Toepassingen: van glijbaan tot zandbak</h2>
<p>De mogelijkheden zijn vrijwel onbeperkt:</p>
<ul>
<li><strong>Interactieve glijbaan:</strong> Projecties op het glijbaanoppervlak reageren op het glijdende kind. Sterren, kleuren of obstakels verschijnen en verdwijnen.</li>
<li><strong>Interactieve zandbak:</strong> Een <a href="/products/interactieve-zandbak.html">interactieve zandbak</a> projecteert landschappen op het zand. Graaf een dal en er stroomt water; bouw een berg en er verschijnt sneeuw.</li>
<li><strong>Interactieve trampolines:</strong> Geprojecteerde doelen op het trampolineoppervlak maken van springen een spel met punten en uitdagingen.</li>
<li><strong>Grondprojectie:</strong> Op pleinen of verharde speeloppervlakken worden spelletjes, parcoursen of danspatronen geprojecteerd.</li>
</ul>

<h2>Investeren in interactieve speeltuintechnologie</h2>
<p>De kosten voor interactieve projectie in speeltuinen variëren sterk, afhankelijk van de schaal en het type installatie. Een enkele interactieve zone begint bij enkele honderden euro's per maand als leasemodel. Grotere installaties met meerdere zones worden op maat geoffreerd.</p>
<p>Het rendement is meetbaar: commerciële locaties rapporteren hogere bezoekersaantallen, langere verblijfstijden en hogere klanttevredenheid. Voor publieke speeltuinen is het maatschappelijk rendement relevant: meer kinderen die meer bewegen.</p>

<h2>De toekomst van spelen is hybride</h2>
<p>De toekomst van de speeltuin ligt niet in een keuze tussen fysiek en digitaal, maar in de combinatie ervan. Interactieve projectie voegt een laag toe aan het traditionele buitenspelen die kinderen aanspreekt in hun digitale belevingswereld, zonder ze achter een scherm te plaatsen. Het is het beste van twee werelden: de fysieke activiteit van buitenspelen, verrijkt met de dynamiek van digitale content.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "De digitale speeltuin: waarom kinderen er dol op zijn (en ouders ook)",
    slug: "digitale-speeltuin-kinderen",
    keyword: "digitale speeltuin kinderen",
    tags: ["Entertainment", "Technologie", "Ouders"],
    custom_excerpt: "Een digitale speeltuin combineert fysiek spel met slimme technologie. Ontdek waarom kinderen én ouders enthousiast zijn over deze nieuwe manier van spelen.",
    published_at: "2026-03-02T10:00:00.000Z",
    html: `
<p>De term <strong>digitale speeltuin</strong> roept bij sommige ouders weerstand op. Nóg meer schermtijd? Maar een echte digitale speeltuin is het tegenovergestelde van een kind achter een tablet. Het is een fysieke ruimte waar kinderen rennen, springen en bewegen — verrijkt met slimme technologie die het spelen dynamischer, uitdagender en leerzamer maakt.</p>

<h2>Wat is een digitale speeltuin precies?</h2>
<p>Een digitale speeltuin is een speelruimte waarin fysieke elementen zijn gecombineerd met interactieve technologie. Denk aan vloeren die reageren op voetstappen, muren waarop je kunt tekenen met je handen, zandbakken die virtuele landschappen tonen, en trampolines die punten tellen bij elke sprong.</p>
<p>Het grote verschil met "gewone" schermtijd: kinderen houden geen device vast. Ze gebruiken hun hele lichaam. De technologie reageert op hen, niet andersom. Dat maakt het fundamenteel anders dan tablet- of tv-entertainment.</p>

<h2>Waarom kinderen het geweldig vinden</h2>
<p>Kinderen groeien op in een wereld vol digitale prikkels. Een traditionele speeltuin met alleen schommels en een glijbaan concurreert in hun beleving met games, video's en apps. Een digitale speeltuin spreekt dezelfde belevingswereld aan, maar dan met fysieke activiteit als basis.</p>
<p>De variatie is eindeloos. Bij elk bezoek kunnen er andere spellen actief zijn. Seizoensgebonden thema's — herfstbladeren in oktober, sneeuwvlokken in december — houden het spel vers. Kinderen worden uitgedaagd op hun niveau, van eenvoudige kleurenspellen voor peuters tot complexe strategiespellen voor oudere kinderen.</p>

<h2>Waarom ouders het waarderen</h2>
<p>Ouders die een digitale speeltuin bezoeken, valt één ding op: hun kinderen bewegen. Niet eventjes, maar langdurig en intensief. Uit observaties blijkt dat kinderen in een digitale speeltuin gemiddeld 40% langer actief zijn dan in een traditionele speelomgeving.</p>
<p>Daarnaast waarderen ouders het educatieve aspect. Spellen die rekenen, taal of samenwerken bevorderen, geven ouders het gevoel dat speeltijd ook leertijd is. En het sociale element — kinderen die samenwerken, communiceren en strategiseren — is precies wat ouders willen zien.</p>
<p>Voor ouders van kinderen met een beperking biedt een digitale speeltuin extra voordelen. Interactieve vloerspellen zijn toegankelijk voor kinderen in een rolstoel. Sensorische projecties spreken kinderen met autisme aan op een niet-bedreigende manier.</p>

<h2>De digitale speeltuin voor kinderopvang en entertainment</h2>
<p>Steeds meer kinderdagverblijven en indoor speelhallen integreren digitale speelelementen. Voor kinderdagverblijven is een <a href="/products/interactieve-vloer.html">interactieve vloer</a> vaak het startpunt: relatief eenvoudig te installeren en direct inzetbaar voor groepsactiviteiten.</p>
<p>Indoor speelhallen en Family Entertainment Centers gaan een stap verder met complete digitale speelzones: meerdere interactieve elementen die samen een samenhangende speelervaring vormen. Van een interactieve ingang die kinderen verwelkomt, tot een <a href="/products/interactieve-zandbak.html">interactieve zandbak</a> als rustiger speelelement.</p>

<h2>Technologie die medegroeit</h2>
<p>Een goed ontworpen digitale speeltuin groeit mee met de kinderen én met de technologie. Software-updates voegen nieuwe spellen en thema's toe zonder dat hardware vervangen hoeft te worden. Content kan worden aangepast aan seizoenen, feestdagen of educatieve thema's. Sommige systemen bieden zelfs de mogelijkheid om eigen content te creëren met een <a href="/products/spel-editor.html">speleditor</a>.</p>
<p>Dit maakt de investering toekomstbestendig: wat u vandaag installeert, is over twee jaar nog relevanter door de groeiende contentbibliotheek.</p>

<h2>De balans tussen digitaal en fysiek</h2>
<p>Een digitale speeltuin is geen vervanging van buitenspelen, zandkastelen bouwen of verstoppertje spelen. Het is een aanvulling — een extra dimensie die inspeelt op de belevingswereld van de huidige generatie kinderen. De technologie staat ten dienste van het fysieke spel, niet andersom. En dat is precies wat de huidige generatie ouders zoekt: het beste van beide werelden.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "Interactieve technologie in de kinderrevalidatie: spelen als therapie",
    slug: "revalidatie-kinderen-interactief",
    keyword: "revalidatie kinderen interactief",
    tags: ["Revalidatie", "Gezondheidszorg", "Technologie"],
    custom_excerpt: "Interactieve technologie maakt kinderrevalidatie leuker en effectiever. Ontdek hoe interactieve vloeren en muren worden ingezet in de revalidatiezorg.",
    published_at: "2026-03-04T09:00:00.000Z",
    html: `
<p>Revalidatie is voor kinderen vaak een uitdaging. Oefeningen zijn repetitief, soms pijnlijk, en de motivatie om vol te houden is moeilijk vast te houden. <strong>Interactieve technologie</strong> verandert dit fundamenteel: door therapieoefeningen te verpakken als spel, worden kinderen intrinsiek gemotiveerd om te bewegen, te oefenen en door te zetten.</p>

<h2>De uitdaging van kinderrevalidatie</h2>
<p>Kinderen die revalideren na een operatie, bij een motorische achterstand of met een chronische aandoening, moeten vaak specifieke oefeningen herhalen. De realiteit: een kind van vier begrijpt niet waarom het twintig keer dezelfde armbeweging moet maken. De motivatie daalt, de therapietrouw vermindert en het herstel vertraagt.</p>
<p>Therapeuten weten dit en proberen oefeningen speels aan te bieden. Maar de mogelijkheden met traditioneel materiaal zijn beperkt. Hier biedt interactieve technologie een doorbraak.</p>

<h2>Hoe interactieve technologie de therapie verrijkt</h2>
<p>Een <a href="/products/interactieve-vloer.html">interactieve vloer</a> in een revalidatiecentrum werkt als volgt: de therapeut selecteert een spel dat de gewenste beweging vereist. Een kind dat zijn balans moet trainen, speelt een spel waarbij het op één been op geprojecteerde stenen moet staan. Een kind dat grove motoriek oefent, vangt virtuele vlinders door te rennen en te springen.</p>
<p>Het kind ervaart therapie als spelen. De therapeut observeert en stuurt bij. De herhaling die nodig is voor herstel, komt vanzelf: kinderen willen het spel opnieuw spelen, een hogere score halen, het volgende level bereiken.</p>
<p>Naast de vloer biedt de <a href="/products/interactieve-muur.html">interactieve muur</a> mogelijkheden voor revalidatie van bovenste ledematen. Reiken, grijpen, tikken en vegen worden onderdeel van een spel in plaats van een oefening.</p>

<h2>Wetenschappelijke onderbouwing</h2>
<p>Internationaal onderzoek ondersteunt de inzet van interactieve technologie in de revalidatie. Een meta-analyse in het Journal of Pediatric Rehabilitation Medicine (2024) toont aan dat gamification in de kinderrevalidatie leidt tot:</p>
<ul>
<li><strong>30-45% hogere therapietrouw</strong> vergeleken met traditionele oefeningen</li>
<li><strong>Significant betere motorische uitkomsten</strong> bij kinderen met cerebrale parese</li>
<li><strong>Hogere motivatie en plezier</strong> tijdens de therapiesessies</li>
<li><strong>Minder therapievermoeidheid</strong> bij langdurige revalidatietrajecten</li>
</ul>
<p>In Nederland zetten steeds meer revalidatiecentra en kinderfysiotherapeuten interactieve technologie in als aanvulling op het bestaande behandelaanbod.</p>

<h2>Toepassingen per doelgroep</h2>
<p>De inzetbaarheid is breed:</p>
<ul>
<li><strong>Motorische achterstand:</strong> Spellen die grove en fijne motoriek stimuleren, afgestemd op het niveau van het kind.</li>
<li><strong>Cerebrale parese:</strong> Bewegingsspellen die specifieke spiergroepen aanspreken en de coördinatie verbeteren.</li>
<li><strong>Postoperatief herstel:</strong> Geleidelijke opbouw van activiteit door spellen met instelbare intensiteit.</li>
<li><strong>Obesitas:</strong> Leuke bewegingsactiviteiten die kinderen motiveren om meer calorieën te verbranden.</li>
<li><strong>Autisme en sensorische verwerking:</strong> Rustige, voorspelbare projecties die sensorische integratie ondersteunen in een veilige omgeving.</li>
</ul>

<h2>Implementatie in de praktijk</h2>
<p>Voor revalidatiecentra en fysiotherapiepraktijken is de drempel laag. Een interactieve vloer vereist een ruimte van minimaal 3x3 meter en een plafondhoogte van 2,5 meter. De installatie is doorgaans binnen een halve dag afgerond.</p>
<p>Belangrijk is de afstemming met het therapeutisch team. De spellen moeten instelbaar zijn op specifieke bewegingspatronen en intensiteitsniveaus. Een goede leverancier denkt mee over welke spellen passen bij welke therapeutische doelen en biedt mogelijkheid tot maatwerk.</p>
<p>Qua financiering kan interactieve technologie in de revalidatiezorg vaak worden meegenomen in de reguliere investeringsbegroting. Sommige zorgverzekeraars vergoeden behandelingen waarbij interactieve technologie wordt ingezet, mits de therapeut de meerwaarde kan onderbouwen.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  },
  {
    title: "Een interactieve zandbak kopen: dit moet u weten",
    slug: "interactieve-zandbak-kopen",
    keyword: "interactieve zandbak kopen",
    tags: ["Producten", "Entertainment", "Technologie"],
    custom_excerpt: "Overweegt u een interactieve zandbak te kopen? Lees alles over de werking, mogelijkheden, kosten en waar u op moet letten bij uw keuze.",
    published_at: "2026-03-06T08:00:00.000Z",
    html: `
<p>De <strong>interactieve zandbak</strong> is een van de meest tot de verbeelding sprekende producten in de wereld van interactieve speeltechnologie. Een gewone zandbak wordt getransformeerd tot een dynamisch landschap waar kinderen vulkanen laten uitbarsten, rivieren laten stromen en onderzeese werelden ontdekken. Maar wat komt er kijken bij het kopen van een interactieve zandbak? En voor wie is het geschikt?</p>

<h2>Hoe werkt een interactieve zandbak?</h2>
<p>Boven de zandbak hangt een combinatie van een projector en een dieptesensor (vergelijkbaar met de technologie in een Xbox Kinect). De sensor scant continu het zandoppervlak en detecteert hoogteverschillen. De projector vertaalt deze hoogteverschillen in real-time naar visuele beelden.</p>
<p>Bouw een berg van zand en er verschijnt een vulkaan met gloeiende lava. Graaf een dal en het vult zich met blauw water. Maak het oppervlak vlak en er verschijnt een oceaan met zwemmende vissen. Kinderen vormen het landschap letterlijk met hun handen — en de technologie brengt het tot leven.</p>

<h2>Voor wie is een interactieve zandbak geschikt?</h2>
<p>De <a href="/products/interactieve-zandbak.html">interactieve zandbak</a> vindt toepassing in uiteenlopende omgevingen:</p>
<ul>
<li><strong>Kinderdagverblijven:</strong> Als rustigere speelhoek naast actievere elementen zoals een interactieve vloer. Ideaal voor sensorisch spel en fijne motoriek.</li>
<li><strong>Musea en science centers:</strong> Geologische en geografische concepten worden tastbaar gemaakt. Kinderen leren over erosie, waterkringlopen en landschapsvorming door te doen.</li>
<li><strong>Indoor speeltuinen:</strong> Een uniek en onderscheidend element dat bezoekers aantrekt en vasthoudt.</li>
<li><strong>Revalidatiecentra:</strong> Fijne motoriek oefenen door zand te manipuleren, verrijkt met visuele feedback die motiveert.</li>
<li><strong>Scholen:</strong> Aardrijkskunde en natuurkunde worden een hands-on ervaring.</li>
</ul>

<h2>Waar moet u op letten bij de aanschaf?</h2>
<p>Bij het kopen van een interactieve zandbak zijn er belangrijke overwegingen:</p>

<h3>Kwaliteit van de projectie</h3>
<p>De helderheid en resolutie van de projector bepalen de visuele kwaliteit. Een projector met minimaal 3.000 lumen is aan te raden voor gebruik in goed verlichte ruimtes. De resolutie van de dieptesensor bepaalt hoe nauwkeurig het systeem reageert op fijne veranderingen in het zandoppervlak.</p>

<h3>Contentaanbod</h3>
<p>Het aantal en de variatie van beschikbare "modi" verschilt per leverancier. Zoek naar systemen die meerdere thema's bieden — van topografische kaarten tot seizoensgebonden landschappen — en die regelmatig nieuwe content toevoegen.</p>

<h3>Afmetingen en installatie</h3>
<p>Interactieve zandbakken zijn er in verschillende formaten, van compacte tafelmodellen (80x60 cm) tot grote inbouwversies (200x150 cm). De sensor en projector worden boven de zandbak gemonteerd op een frame of aan het plafond. Houd rekening met een minimale hoogte van 1,5 meter boven het zandoppervlak.</p>

<h3>Zand en hygiëne</h3>
<p>Gebruik speciaal kinetisch of gewassen speelzand dat stofvrij is. Regulier onderhoud omvat het periodiek reinigen en vervangen van het zand. De technologie zelf is onderhoudsvrij.</p>

<h3>Budget</h3>
<p>Prijzen voor interactieve zandbakken variëren sterk. Compacte modellen beginnen bij enkele duizenden euro's; professionele inbouwsystemen voor commercieel gebruik liggen hoger. Leasemodellen maken de investering behapbaar — informeer naar de mogelijkheden.</p>

<h2>Educatieve waarde</h2>
<p>De educatieve mogelijkheden van een interactieve zandbak worden vaak onderschat. Kinderen leren intuïtief over:</p>
<ul>
<li>Oorzaak en gevolg (graven = water, bouwen = vulkaan)</li>
<li>Ruimtelijk inzicht en driedimensionaal denken</li>
<li>Samenwerken — samen een landschap vormgeven vereist overleg</li>
<li>Natuurkundige concepten zoals waterstroming en erosie</li>
<li>Creatief denken en verbeeldingskracht</li>
</ul>

<h2>Interactieve zandbak versus traditionele zandbak</h2>
<p>Een interactieve zandbak vervangt het traditionele zandbakspel niet — het verrijkt het. Kinderen scheppen, graven en bouwen nog steeds met hun handen in echt zand. De projectie voegt een laag toe die de verbeelding prikkelt en het spel verlengt. Waar kinderen in een traditionele zandbak na 15-20 minuten vaak zijn uitgekeken, blijven ze bij een interactieve variant tot 45 minuten gefascineerd bezig.</p>

<p>Benieuwd wat IAM voor uw locatie kan betekenen? <a href="/contact">Neem contact op</a> voor een vrijblijvend adviesgesprek.</p>
`
  }
];

async function main() {
  for (const post of posts) {
    try {
      const result = await ghostPost('posts/', {
        posts: [{
          title: post.title,
          slug: post.slug,
          html: post.html,
          custom_excerpt: post.custom_excerpt,
          status: 'published',
          published_at: post.published_at,
          tags: post.tags.map(t => ({ name: t }))
        }]
      });
      console.log(`✅ Published: "${post.title}" → /${post.slug}/ (keyword: ${post.keyword})`);
    } catch (err) {
      console.error(`❌ Failed: "${post.title}" — ${err.message}`);
    }
  }
}

main();
