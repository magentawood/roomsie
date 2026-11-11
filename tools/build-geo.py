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

# Places that Wikidata has with no point. Each one takes the point of the station next to it.
NEAR_STATION = {
    'Ramnarain Ruia College|Ruia College|Ruia': 'Matunga Road', 'R. A. Podar College of Commerce and Economics|Podar College|Podar': 'Matunga Road',
    'SNDT Women\'s University|SNDT': 'Churchgate', 'D. Y. Patil University|DY Patil Nerul|DY Patil': 'Nerul',
    'Thadomal Shahani Engineering College|Thadomal': 'Bandra', 'KEM Hospital|Seth G.S. Medical College|GS Medical': 'Prabhadevi',
    'NESCO|Bombay Exhibition Centre': 'Ram Mandir', 'Film City|Dadasaheb Phalke Chitranagari': 'Goregaon',
    'Andheri MIDC|MIDC Andheri': 'Chakala', 'Mindspace Malad': 'Malad', 'Mindspace Airoli': 'Airoli', 'Inorbit Mall Malad': 'Malad',
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
    data = {'source': 'Wikidata (CC0), built by tools/build-geo.py', 'stations': stations, 'lines': lines, 'places': destinations, 'areas': areas}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('wrote', OUT.relative_to(ROOT), OUT.stat().st_size, 'bytes', file=sys.stderr)


if __name__ == '__main__':
    main()
