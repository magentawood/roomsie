#!/usr/bin/env python3
"""Build apps/api/src/geo/mumbai.json: the stations, the lines, the places and the areas of Mumbai, from Wikidata (CC0).

The assistant reads it to give real distances and routes, and the chat draws the map of a trip from it.
Run it again when a line opens or a place moves: python3 tools/build-geo.py
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'apps/api/src/geo/mumbai.json'
SEED = ROOT / 'apps/api/src/db/seed-areas.ts'
UA = {'User-Agent': 'roomsie-geo/1.0 (roomsie.in@gmail.com)', 'Accept': 'application/sparql-results+json'}
BOX = (18.85, 72.75, 19.50, 73.20)

# The lines of the commute, by their Wikidata item. A line that runs few trains, as Vasai Road to Roha, is out.
LINES = {
    'Q7988022': ('Western line', 'rail'), 'Q5061366': ('Central line', 'rail'), 'Q5654835': ('Harbour line', 'rail'),
    'Q7833528': ('Trans-Harbour line', 'rail'), 'Q28153731': ('Uran line', 'rail'),
    'Q6553099': ('Metro Line 1', 'metro'), 'Q28419528': ('Metro Line 2A', 'metro'), 'Q17068887': ('Metro Line 3', 'metro'),
    'Q28419537': ('Metro Line 7', 'metro'), 'Q30602645': ('Metro Line 9', 'metro'), 'Q17068873': ('Navi Mumbai Metro', 'metro'),
    'Q6553100': ('Monorail', 'monorail'),
}

# The places that people name in a question: colleges, offices, hospitals, malls and the areas around them.
DESTINATIONS = """
Indian Institute of Technology Bombay|IIT Bombay|IIT Powai
SVKM's Narsee Monjee Institute of Management Studies|NMIMS
Mithibai College|Mithibai
Jai Hind College|Jai Hind
Ruparel College|Ruparel
VJTI|Veermata Jijabai Technological Institute
Institute of Chemical Technology|ICT Mumbai|UDCT
Tata Institute of Social Sciences|TISS
K. J. Somaiya College of Engineering|Somaiya|KJ Somaiya
Wilson College, Mumbai|Wilson College
Elphinstone College
Kishinchand Chellaram College|KC College
H.R. College of Commerce and Economics|HR College
Narsee Monjee College of Commerce and Economics|NM College
Sophia College for Women|Sophia College
St. Xavier's College, Mumbai|St Xavier's College|Xavier's
University of Mumbai|Mumbai University|Kalina campus
Thakur College of Engineering and Technology|Thakur College
Rizvi College of Engineering|Rizvi College
SIES College|SIES
Sardar Patel Institute of Technology|SPIT
Fr. Conceicao Rodrigues College of Engineering|Fr. CRCE|Agnel
Grant Medical College|JJ Hospital
Lokmanya Tilak Municipal General Hospital|Sion Hospital
Lilavati Hospital
Hinduja Hospital
Nanavati Hospital
Kokilaben Dhirubhai Ambani Hospital|Kokilaben Hospital
Tata Memorial Centre|Tata Memorial Hospital|Tata Hospital
Jaslok Hospital
Breach Candy Hospital
Bandra Kurla Complex|BKC
Nariman Point
Lower Parel
Worli
Powai
Hiranandani Gardens|Hiranandani
SEEPZ
Marol Naka|Marol
Phoenix Marketcity Mumbai|Phoenix Marketcity Kurla
Infiniti Mall
R City Mall
Oberoi Mall
Lokhandwala Complex|Lokhandwala
Chhatrapati Shivaji Maharaj International Airport|Mumbai airport|airport
Fort, Mumbai|Fort
Colaba
Malabar Hill
Cuffe Parade
Juhu
Chandivali
Navi Mumbai
"""

# Places that Wikidata has with no point, or under a name that its search could mix up. Each one takes the point of the station
# next to it. A place that a chat names and this list lacks goes to the locator, which picks its area (the founders, 2026-11-11).
NEAR_STATION = {
    'Ramnarain Ruia College|Ruia College|Ruia': 'Matunga Road', 'R. A. Podar College of Commerce and Economics|Podar College': 'Matunga Road',
    'SNDT Women\'s University|SNDT': 'Churchgate', 'D. Y. Patil University|DY Patil Nerul|DY Patil': 'Nerul',
    'Thadomal Shahani Engineering College|Thadomal': 'Bandra', 'KEM Hospital|Seth G.S. Medical College|GS Medical': 'Prabhadevi',
    'NESCO|Bombay Exhibition Centre': 'Ram Mandir', 'Film City|Dadasaheb Phalke Chitranagari': 'Goregaon',
    'Andheri MIDC|MIDC Andheri': 'Chakala', 'Mindspace Malad': 'Malad', 'Mindspace Airoli': 'Airoli', 'Inorbit Mall Malad': 'Malad',
    # Colleges of engineering, management, design and medicine.
    'MGM College of Engineering and Technology|MGM College|MGM|MGM Kamothe|MGMCET': 'Khandeshwar',
    'MGM Institute of Health Sciences|MGM Medical College|MGM Hospital Kamothe': 'Khandeshwar', 'MGM Hospital Vashi|MGM Vashi': 'Vashi',
    "Vivekanand Education Society's Institute of Technology|VESIT|VES College|VES Chembur": 'Chembur',
    'Shah and Anchor Kutchhi Engineering College|Shah and Anchor': 'Chembur', 'Don Bosco Institute of Technology|DBIT': 'Kurla',
    'Atharva College of Engineering|Atharva College': 'Malad', 'Vidyalankar Institute of Technology|Vidyalankar': 'Bhakti Park',
    'Xavier Institute of Engineering|XIE': 'Mahim Junction', 'Dwarkadas J. Sanghvi College of Engineering|DJ Sanghvi|DJSCE': 'Vile Parle',
    'Mukesh Patel School of Technology Management and Engineering|MPSTME': 'Vile Parle', 'St. Francis Institute of Technology|SFIT': 'Borivali',
    'Rajiv Gandhi Institute of Technology|RGIT': 'D.N. Nagar', 'Terna Engineering College|Terna': 'Nerul', 'Ramrao Adik Institute of Technology|RAIT': 'Nerul',
    'Bharati Vidyapeeth College of Engineering|Bharati Vidyapeeth Kharghar': 'Kharghar', 'Lokmanya Tilak College of Engineering|LTCE': 'Kopar Khairane',
    'Pillai College of Engineering|Pillai College': 'Khandeshwar', 'Datta Meghe College of Engineering|DMCE': 'Airoli',
    'Saraswati College of Engineering': 'Kharghar', 'Fr. C. Rodrigues Institute of Technology|FCRIT|Agnel Vashi': 'Vashi',
    'Jamnalal Bajaj Institute of Management Studies|JBIMS': 'Churchgate', 'S. P. Jain Institute of Management and Research|SPJIMR|SP Jain': 'Andheri',
    'Welingkar Institute of Management|Welingkar': "King's Circle", 'National Institute of Fashion Technology Mumbai|NIFT Mumbai|NIFT': 'Kharghar',
    'Sir J. J. School of Art|JJ School of Art|JJ College of Architecture': 'Chhatrapati Shivaji Maharaj Terminus', 'Rachana Sansad': 'Prabhadevi',
    'Whistling Woods International|Whistling Woods': 'Goregaon', 'Xavier Institute of Communications|XIC': 'Chhatrapati Shivaji Maharaj Terminus',
    'Amity University Mumbai|Amity Panvel': 'Panvel', 'ITM Kharghar|ITM': 'Kharghar',
    'Bhabha Atomic Research Centre|BARC': 'Govandi', 'Tata Institute of Fundamental Research|TIFR': 'Cuffe Parade',
    # Colleges of arts, science, commerce and law.
    'Kirti M. Doongursee College|Kirti College': 'Dadar', 'Sathaye College': 'Vile Parle', "Bhavan's College|Bhavans College|Bhavans": 'Andheri',
    'Chetana College': 'Bandra', "St. Andrew's College": 'Bandra', 'R. D. National College|National College Bandra': 'Khar Road', 'MMK College': 'Bandra',
    'Dalmia College': 'Malad', 'Patkar-Varde College|Patkar College': 'Goregaon', 'Nagindas Khandwala College|Khandwala College': 'Malad',
    'V. G. Vaze College|Vaze College': 'Mulund', 'Mulund College of Commerce': 'Mulund', 'Ramniranjan Jhunjhunwala College|RJ College': 'Ghatkopar',
    'Guru Nanak Khalsa College|Khalsa College': "King's Circle", 'Lala Lajpat Rai College|LLR College': 'Mahalaxmi',
    'Siddharth College': 'Chhatrapati Shivaji Maharaj Terminus', 'Government Law College|GLC Mumbai': 'Churchgate', 'Sydenham College': 'Churchgate',
    'K. C. Law College|KC Law College': 'Churchgate', 'Nirmala Niketan College': 'Churchgate', 'Hinduja College': 'Charni Road',
    'Model College Dombivli|Model College': 'Dombivli', 'Pendharkar College': 'Dombivli', 'B. N. Bandodkar College|Bandodkar College': 'Thane',
    'Joshi Bedekar College|Bedekar College': 'Thane',
    # Hospitals.
    'Nair Hospital|B. Y. L. Nair Hospital|Topiwala National Medical College': 'Mumbai Central', 'Cooper Hospital|HBT Medical College': 'Vile Parle',
    'Bombay Hospital': 'Marine Lines', 'Saifee Hospital': 'Charni Road', 'Wockhardt Hospital Mumbai Central|Wockhardt Hospital': 'Mumbai Central',
    'Fortis Hospital Mulund|Fortis Mulund': 'Mulund', 'Jupiter Hospital Thane|Jupiter Hospital': 'Thane', 'Bhabha Hospital Bandra|Bhabha Hospital': 'Bandra',
    'Holy Family Hospital': 'Bandra', 'SevenHills Hospital|Seven Hills Hospital': 'Marol Naka', 'Global Hospital Parel|Global Hospital': 'Prabhadevi',
    'Sir H. N. Reliance Foundation Hospital|HN Reliance Hospital|Reliance Hospital': 'Charni Road', 'Masina Hospital': 'Byculla',
    'Rajawadi Hospital': 'Ghatkopar', 'Apollo Hospital Navi Mumbai|Apollo Belapur': 'CBD Belapur', 'Terna Hospital': 'Nerul', 'Wadia Hospital': 'Prabhadevi',
    # Offices, malls and places that people commute to.
    'Kamala Mills|Kamala Mills Compound': 'Lower Parel', 'Phoenix Palladium|High Street Phoenix|Palladium Mall': 'Lower Parel', 'Atria Mall': 'Worli',
    'Reliance Corporate Park|RCP Ghansoli': 'Ghansoli', 'Millennium Business Park|Mahape': 'Ghansoli', 'Wagle Estate': 'Thane', 'Airoli Knowledge Park': 'Airoli',
    'Infinity IT Park': 'Dindoshi', 'Nirlon Knowledge Park|NKP': 'Goregaon East', 'Equinox Business Park': 'Kurla', 'Godrej One|Godrej Vikhroli': 'Vikhroli',
    'Bombay Stock Exchange|BSE|Dalal Street': 'Hutatma Chowk', 'Mantralaya': 'Vidhan Bhavan', 'World Trade Centre Mumbai|WTC Mumbai': 'Cuffe Parade',
    'Ballard Estate': 'Chhatrapati Shivaji Maharaj Terminus', 'Jio World Centre|Jio World Drive|Jio Convention Centre': 'Bandra-Kurla Complex',
    'Seawoods Grand Central|Nexus Seawoods': 'Seawoods–Darave', 'Inorbit Mall Vashi|Inorbit Vashi': 'Vashi', "Growel's 101 Mall|Growels Mall": 'Akurli',
    'Korum Mall': 'Thane', 'Marine Drive': 'Marine Lines', 'Haji Ali': 'Mahalaxmi', 'Shivaji Park': 'Dadar', 'Wankhede Stadium': 'Churchgate',
    'DY Patil Stadium': 'Nerul', 'Carter Road': 'Khar Road', 'Linking Road': 'Khar Road', 'Hill Road': 'Bandra',
}

# Places far from a station. Each one takes the point of its area.
NEAR_AREA = {
    'A. P. Shah Institute of Technology|AP Shah|APSIT': 'kasarvadavali', 'Thakur College of Science and Commerce|Thakur College of Commerce': 'thakur-village',
    'Thakur Institute of Management Studies|TIMSR': 'thakur-village', 'Indian Institute of Management Mumbai|IIM Mumbai|NITIE': 'powai',
    'Kamla Raheja Vidyanidhi Institute for Architecture|KRVIA': 'juhu', 'Hiranandani Hospital|L. H. Hiranandani Hospital': 'hiranandani-gardens',
    'Viviana Mall': 'thane-west', 'Upvan Lake': 'pokhran-road', 'Gateway of India': 'colaba', 'Juhu Beach': 'juhu', 'Bandstand|Bandra Bandstand': 'bandra-west',
    'Navi Mumbai International Airport|NMIA|Navi Mumbai Airport': 'ulwe',
}


def sparql(query):
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': query})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return json.load(r)['results']['bindings']


def api(params):
    url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA['User-Agent']}), timeout=60) as r:
        return json.load(r)


def in_box(lat, lng):
    return BOX[0] <= lat <= BOX[2] and BOX[1] <= lng <= BOX[3]


def point(wkt):
    lng, lat = map(float, re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', wkt).groups())
    return round(lat, 5), round(lng, 5)


def short(name):
    return re.sub(r'\s+(railway|metro|monorail|suburban railway) station$', '', name, flags=re.I).strip()


def stations_and_lines():
    box = f'bd:serviceParam wikibase:cornerSouthWest "Point({BOX[1]} {BOX[0]})"^^geo:wktLiteral. bd:serviceParam wikibase:cornerNorthEast "Point({BOX[3]} {BOX[2]})"^^geo:wktLiteral.'
    rows = sparql(f'''SELECT ?s ?sLabel ?coord ?adj ?line WHERE {{
      SERVICE wikibase:box {{ ?s wdt:P625 ?coord. {box} }}
      ?s wdt:P31/wdt:P279* wd:Q55488. ?s p:P197 ?st. ?st ps:P197 ?adj. ?st pq:P81 ?line.
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}''')
    stations, edges = {}, {}
    for b in rows:
        line = b['line']['value'].split('/')[-1]
        if line not in LINES:
            continue
        s, adj = b['s']['value'].split('/')[-1], b['adj']['value'].split('/')[-1]
        lat, lng = point(b['coord']['value'])
        stations[s] = {'id': s, 'name': short(b['sLabel']['value']), 'lat': lat, 'lng': lng}
        edges.setdefault(line, set()).add(tuple(sorted((s, adj))))
    # An edge to a station outside the box has no point: it goes.
    lines = [{'id': q, 'name': LINES[q][0], 'mode': LINES[q][1], 'edges': sorted([a, b] for a, b in edges.get(q, set()) if a in stations and b in stations)} for q in LINES]
    return sorted(stations.values(), key=lambda s: s['id']), lines


def lookup(names):
    """The first item of a search, in the box, with a point."""
    for name in names:
        found = api({'action': 'wbsearchentities', 'search': name, 'language': 'en', 'limit': 7})
        ids = [s['id'] for s in found.get('search', [])]
        if not ids:
            continue
        entities = api({'action': 'wbgetentities', 'ids': '|'.join(ids), 'props': 'claims|labels', 'languages': 'en'})['entities']
        for i in ids:
            claim = entities[i].get('claims', {}).get('P625')
            value = claim and claim[0]['mainsnak'].get('datavalue', {}).get('value')
            if value and in_box(value['latitude'], value['longitude']):
                return {'id': i, 'lat': round(value['latitude'], 5), 'lng': round(value['longitude'], 5)}
        time.sleep(0.2)
    return None


def station_named(stations, name):
    want = name.lower()
    return next((s for s in stations if s['name'].lower() == want), None)


def places(stations):
    out = []
    for line in DESTINATIONS.strip().splitlines():
        names = line.split('|')
        found = lookup(names[:1]) or lookup(names[1:2])
        if found:
            out.append({'name': names[0], 'aliases': names[1:], 'lat': found['lat'], 'lng': found['lng'], 'source': found['id']})
        else:
            print('no point:', names[0], file=sys.stderr)
    for line, near in NEAR_STATION.items():
        names = line.split('|')
        station = station_named(stations, near)
        if station:
            out.append({'name': names[0], 'aliases': names[1:], 'lat': station['lat'], 'lng': station['lng'], 'source': f'near {near}'})
        else:
            print('no station:', near, file=sys.stderr)
    return out


def seed_areas():
    """The areas of the seed with their parent, read from the TypeScript source."""
    text = SEED.read_text()
    found, stack = [], []
    for m in re.finditer(r"\{ slug: '([^']+)', name: '([^']+)'(?:, aliases: \[([^\]]*)\])?(, areas: \[)?|\]\s*\}", text):
        if m.group(0).startswith(']'):
            if stack:
                stack.pop()
            continue
        slug, name, aliases = m.group(1), m.group(2), re.findall(r"'([^']+)'", m.group(3) or '')
        found.append({'slug': slug, 'name': name, 'aliases': aliases, 'parent': stack[-1] if stack else None})
        if m.group(4):
            stack.append(slug)
    return found


def area_points(stations, areas):
    points = {}
    for area in areas:
        if area['parent'] is None:
            continue
        names = [area['name'], *area['aliases']]
        station = next((station_named(stations, n) for n in names if station_named(stations, n)), None)
        if not station:
            base = re.sub(r'\s+(West|East)$', '', area['name'])
            station = station_named(stations, base)
        if station:
            points[area['slug']] = {'lat': station['lat'], 'lng': station['lng'], 'source': f"station {station['name']}"}
            continue
        found = lookup([f"{area['name']}, Mumbai", area['name'], *area['aliases'][:2]])
        if found:
            points[area['slug']] = {'lat': found['lat'], 'lng': found['lng'], 'source': found['id']}
    # An area with no point takes the middle of its own areas, then the point of its parent.
    for _ in range(2):
        for area in areas:
            if area['slug'] in points:
                continue
            kids = [points[a['slug']] for a in areas if a['parent'] == area['slug'] and a['slug'] in points]
            if kids:
                points[area['slug']] = {'lat': round(sum(k['lat'] for k in kids) / len(kids), 5), 'lng': round(sum(k['lng'] for k in kids) / len(kids), 5), 'source': 'middle of its areas'}
    for area in areas:
        if area['slug'] not in points and area['parent'] in points:
            points[area['slug']] = {**points[area['parent']], 'source': 'its parent'}
    missing = [a['slug'] for a in areas if a['slug'] not in points]
    if missing:
        print('areas with no point:', missing, file=sys.stderr)
    return points


def main():
    stations, lines = stations_and_lines()
    print(len(stations), 'stations,', sum(len(l['edges']) for l in lines), 'edges', file=sys.stderr)
    destinations = places(stations)
    print(len(destinations), 'places', file=sys.stderr)
    seeds = seed_areas()
    areas = area_points(stations, seeds)
    for seed in seeds:
        if seed['slug'] in areas:
            areas[seed['slug']].update(name=seed['name'], aliases=seed['aliases'], group=seed['parent'] is None)
    print(len(areas), 'areas', file=sys.stderr)
    for line, slug in NEAR_AREA.items():
        names = line.split('|')
        if slug in areas:
            destinations.append({'name': names[0], 'aliases': names[1:], 'lat': areas[slug]['lat'], 'lng': areas[slug]['lng'], 'source': f'area {slug}'})
        else:
            print('no area:', slug, file=sys.stderr)
    data = {'source': 'Wikidata (CC0), built by tools/build-geo.py', 'stations': stations, 'lines': lines, 'places': destinations, 'areas': areas}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('wrote', OUT.relative_to(ROOT), OUT.stat().st_size, 'bytes', file=sys.stderr)


if __name__ == '__main__':
    main()
