/** The areas of PD2: the area groups, their sub-areas and the pockets inside a sub-area (docs/specs/sub-areas.md). */
import { sql } from 'drizzle-orm'
import type { Db } from './client'
import { areas } from './schema'

type AreaSeed = { slug: string; name: string; aliases?: string[]; areas?: AreaSeed[] }

/** In the order of the designs. A slug never changes: listings, profiles and area pages link it. */
const AREAS: AreaSeed[] = [
  { slug: 'andheri-goregaon', name: 'Andheri–Goregaon', areas: [
    { slug: 'andheri-west', name: 'Andheri West', aliases: ['Andheri W', 'Andheri (W)', 'Amboli', 'DN Nagar', 'Azad Nagar', 'Veera Desai Road', 'Andheri'], areas: [
      { slug: 'lokhandwala', name: 'Lokhandwala', aliases: ['Lokhandwala Complex', 'Lokhandwala Andheri', 'Lokhandwala Back Road'] },
      { slug: 'versova', name: 'Versova', aliases: ['Yari Road', 'Seven Bungalows', '7 Bungalows', 'Four Bungalows', '4 Bungalows', 'Aram Nagar'] },
      { slug: 'oshiwara', name: 'Oshiwara', aliases: ['Oshiwara Andheri West', 'Oshiwara Jogeshwari West', 'New Link Road Oshiwara'] },
    ] },
    { slug: 'andheri-east', name: 'Andheri East', aliases: ['Andheri E', 'Andheri (E)', 'Chakala', 'JB Nagar', 'MIDC Andheri', 'Sher-e-Punjab', 'Mahakali Caves Road', 'Sahar', 'Airport Road', 'SEEPZ', 'Andheri'], areas: [
      { slug: 'marol', name: 'Marol', aliases: ['Marol Naka', 'Marol Maroshi Road', 'Military Road Marol'] },
      { slug: 'saki-naka', name: 'Saki Naka', aliases: ['Sakinaka', 'Saki Naka Andheri East'] },
    ] },
    { slug: 'jogeshwari-west', name: 'Jogeshwari West', aliases: ['Jogeshwari W', 'Jogeshwari (W)', 'Jogeshwari'] },
    { slug: 'jogeshwari-east', name: 'Jogeshwari East', aliases: ['Jogeshwari E', 'Jogeshwari (E)', 'JVLR Jogeshwari', 'Jogeshwari'] },
    { slug: 'goregaon-west', name: 'Goregaon West', aliases: ['Goregaon W', 'Goregaon (W)', 'Bangur Nagar', 'Motilal Nagar', 'Jawahar Nagar', 'Unnat Nagar', 'Goregaon'] },
    { slug: 'goregaon-east', name: 'Goregaon East', aliases: ['Goregaon E', 'Goregaon (E)', 'Gokuldham', 'Film City Road', 'Dindoshi', 'NESCO', 'Aarey Colony', 'Royal Palms', 'Goregaon'] },
  ] },
  { slug: 'bandra-santacruz', name: 'Bandra–Santacruz', areas: [
    { slug: 'bandra-west', name: 'Bandra West', aliases: ['Bandra W', 'Bandra (W)', 'Pali Hill', 'Carter Road', 'Hill Road', 'Bandstand', 'Chapel Road', 'Mount Mary', 'Bandra'] },
    { slug: 'bandra-east', name: 'Bandra East', aliases: ['Bandra E', 'Bandra (E)', 'Kherwadi', 'Kalanagar', 'Government Colony', 'BKC', 'Bandra Kurla Complex', 'Bandra'] },
    { slug: 'khar', name: 'Khar', aliases: ['Khar West', 'Khar East', 'Khar Road', 'Khar (W)', 'Khar Danda'] },
    { slug: 'santacruz-west', name: 'Santacruz West', aliases: ['Santa Cruz West', 'Santacruz W', 'Santacruz (W)', 'Daulat Nagar', 'Santacruz', 'Santa Cruz'] },
    { slug: 'santacruz-east', name: 'Santacruz East', aliases: ['Santa Cruz East', 'Santacruz E', 'Santacruz (E)', 'Vakola', 'Prabhat Colony', 'Santacruz', 'Santa Cruz'], areas: [
      { slug: 'kalina', name: 'Kalina', aliases: ['Vidyanagari', 'Kolivery Village', 'CST Road', 'Kalina Campus'] },
    ] },
    { slug: 'vile-parle-west', name: 'Vile Parle West', aliases: ['Vile Parle W', 'Vile Parle (W)', 'Parle West', 'Irla', 'Gulmohar Road', 'Vile Parle', 'Parle'] },
    { slug: 'vile-parle-east', name: 'Vile Parle East', aliases: ['Vile Parle E', 'Vile Parle (E)', 'Parle East', 'Parla', 'Vile Parle', 'Parle'] },
    { slug: 'juhu', name: 'Juhu', aliases: ['Juhu Scheme', 'JVPD', 'Juhu Tara Road', 'Juhu Koliwada'] },
  ] },
  { slug: 'powai-vikhroli', name: 'Powai–Vikhroli', areas: [
    { slug: 'powai', name: 'Powai', aliases: ['IIT Powai', 'Powai Lake', 'Panchkutir', 'JVLR Powai', 'Saki Vihar Road'], areas: [
      { slug: 'hiranandani-gardens', name: 'Hiranandani Gardens', aliases: ['Hiranandani Powai', 'Hiranandani Gardens Powai', 'Hiranandani'] },
    ] },
    { slug: 'chandivali', name: 'Chandivali', aliases: ['Raheja Vihar', 'Tunga Village', 'Chandivali Farm Road'] },
    { slug: 'vikhroli-east', name: 'Vikhroli East', aliases: ['Vikhroli E', 'Kannamwar Nagar', 'Tagore Nagar', 'Godrej Vikhroli', 'Vikhroli'] },
    { slug: 'vikhroli-west', name: 'Vikhroli West', aliases: ['Vikhroli W', 'Parksite', 'LBS Marg Vikhroli', 'JVLR Vikhroli', 'Vikhroli'] },
    { slug: 'kanjurmarg-east', name: 'Kanjurmarg East', aliases: ['Kanjurmarg E', 'Kanjur Marg East', 'Kanjur Village', 'Kanjurmarg', 'Kanjur Marg'] },
    { slug: 'kanjurmarg-west', name: 'Kanjurmarg West', aliases: ['Kanjurmarg W', 'Kanjur Marg West', 'Runwal Forests', 'Kanjurmarg', 'Kanjur Marg'] },
    { slug: 'bhandup-west', name: 'Bhandup West', aliases: ['Bhandup W', 'Sonapur', 'Village Road Bhandup', 'LBS Marg Bhandup', 'Bhandup'] },
    { slug: 'bhandup-east', name: 'Bhandup East', aliases: ['Bhandup E', 'Bhandup (E)', 'Bhandup'] },
    { slug: 'mulund-west', name: 'Mulund West', aliases: ['Mulund W', 'Mulund Colony', 'Panch Rasta', 'Vasant Garden', 'Nahur', 'Mulund'] },
    { slug: 'mulund-east', name: 'Mulund East', aliases: ['Mulund E', 'Mulund (E)', 'Mulund'] },
  ] },
  { slug: 'lower-parel-worli', name: 'Lower Parel–Worli', areas: [
    { slug: 'worli', name: 'Worli', aliases: ['Worli Sea Face', 'Worli Naka', 'Worli Koliwada'] },
    { slug: 'lower-parel', name: 'Lower Parel', aliases: ['Lower Parel West', 'Lower Parel East', 'Upper Worli', 'Kamala Mills', 'Senapati Bapat Marg', 'NM Joshi Marg', 'Delisle Road'] },
    { slug: 'prabhadevi', name: 'Prabhadevi', aliases: ['Elphinstone Road', 'Elphinstone', 'Siddhivinayak'] },
    { slug: 'parel', name: 'Parel', aliases: ['Lalbaug', 'Curry Road', 'Currey Road', 'Sewri', 'Naigaon'] },
    { slug: 'mahalaxmi', name: 'Mahalaxmi', aliases: ['Mahalakshmi', 'Jacob Circle', 'Saat Rasta', 'Haji Ali', 'Mahalaxmi Race Course'] },
  ] },
  { slug: 'dadar-sion', name: 'Dadar–Sion', areas: [
    { slug: 'dadar-west', name: 'Dadar West', aliases: ['Dadar W', 'Dadar (W)', 'Shivaji Park', 'Dadar'] },
    { slug: 'dadar-east', name: 'Dadar East', aliases: ['Dadar E', 'Dadar (E)', 'Dadar TT', 'Hindmata', 'Dadar'] },
    { slug: 'mahim', name: 'Mahim', aliases: ['Mahim West', 'Mahim Causeway', 'Dharavi'] },
    { slug: 'matunga', name: 'Matunga', aliases: ['Matunga East', 'Matunga West', 'King\'s Circle', 'Kings Circle', 'Five Gardens', 'Matunga Road'] },
    { slug: 'sion', name: 'Sion', aliases: ['Sion East', 'Sion West', 'Sion Koliwada'] },
    { slug: 'wadala', name: 'Wadala', aliases: ['Wadala East', 'Wadala West', 'Bhakti Park', 'Antop Hill', 'CGS Colony', 'Wadala Road'] },
  ] },
  { slug: 'south-mumbai', name: 'South Mumbai', aliases: ['SoBo'], areas: [
    { slug: 'colaba', name: 'Colaba', aliases: ['Navy Nagar', 'Colaba Causeway'] },
    { slug: 'cuffe-parade', name: 'Cuffe Parade', aliases: ['Cuff Parade'] },
    { slug: 'churchgate', name: 'Churchgate', aliases: ['Marine Drive', 'Nariman Point'] },
    { slug: 'fort', name: 'Fort', aliases: ['Ballard Estate', 'Kala Ghoda', 'CST', 'CSMT', 'VT'] },
    { slug: 'marine-lines', name: 'Marine Lines', aliases: ['Kalbadevi', 'Dhobi Talao'] },
    { slug: 'girgaon', name: 'Girgaon', aliases: ['Girgaum', 'Charni Road', 'Chowpatty', 'Khetwadi'] },
    { slug: 'grant-road', name: 'Grant Road', aliases: ['Nana Chowk', 'Opera House', 'Gamdevi'] },
    { slug: 'malabar-hill', name: 'Malabar Hill', aliases: ['Walkeshwar', 'Napean Sea Road', 'Peddar Road', 'Breach Candy', 'Kemps Corner', 'Cumballa Hill', 'Altamount Road'] },
    { slug: 'tardeo', name: 'Tardeo', aliases: ['AC Market', 'Tardeo Road'] },
    { slug: 'mumbai-central', name: 'Mumbai Central', aliases: ['Bombay Central', 'Agripada', 'Nagpada'] },
    { slug: 'byculla', name: 'Byculla', aliases: ['Byculla East', 'Byculla West', 'Chinchpokli'] },
    { slug: 'mazgaon', name: 'Mazgaon', aliases: ['Dockyard Road', 'Dongri', 'Reay Road'] },
  ] },
  { slug: 'malad-borivali', name: 'Malad–Borivali', areas: [
    { slug: 'malad-west', name: 'Malad West', aliases: ['Malad W', 'Malad (W)', 'Orlem', 'Evershine Nagar', 'Mindspace Malad', 'Chincholi Bunder', 'Malvani', 'Madh', 'Marve', 'Manori', 'Malad'] },
    { slug: 'malad-east', name: 'Malad East', aliases: ['Malad E', 'Malad (E)', 'Kurar', 'Pathanwadi', 'Raheja Township', 'Pushpa Park', 'Malad'] },
    { slug: 'kandivali-west', name: 'Kandivali West', aliases: ['Kandivali W', 'Kandivli West', 'Charkop', 'Mahavir Nagar', 'Dahanukar Wadi', 'Kandivali', 'Kandivli'] },
    { slug: 'kandivali-east', name: 'Kandivali East', aliases: ['Kandivali E', 'Kandivli East', 'Lokhandwala Township', 'Akurli Road', 'Samta Nagar', 'Kandivali', 'Kandivli'], areas: [
      { slug: 'thakur-village', name: 'Thakur Village', aliases: ['Thakur Complex', 'Thakur Village Kandivali'] },
    ] },
    { slug: 'borivali-west', name: 'Borivali West', aliases: ['Borivali W', 'Borivli West', 'IC Colony', 'Gorai', 'Chikuwadi', 'Shimpoli', 'Eksar', 'Borivali', 'Borivli'] },
    { slug: 'borivali-east', name: 'Borivali East', aliases: ['Borivali E', 'Borivli East', 'Devipada', 'Kajupada', 'Magathane', 'Oberoi Sky City', 'Borivali', 'Borivli'] },
    { slug: 'dahisar-west', name: 'Dahisar West', aliases: ['Dahisar W', 'Dahisar (W)', 'Kandarpada', 'Dahisar'] },
    { slug: 'dahisar-east', name: 'Dahisar East', aliases: ['Dahisar E', 'Dahisar (E)', 'Anand Nagar Dahisar', 'Ketkipada', 'Dahisar'] },
    { slug: 'mira-road', name: 'Mira Road', aliases: ['Mira Road East', 'Mira Road West', 'Kashimira', 'Naya Nagar', 'Mira Bhayandar', 'Mira-Bhayandar'] },
    { slug: 'bhayandar', name: 'Bhayandar', aliases: ['Bhayander', 'Bhayandar East', 'Bhayandar West', 'Bhayander East', 'Bhayander West', 'Mira Bhayandar', 'Mira-Bhayandar'] },
  ] },
  { slug: 'chembur-ghatkopar', name: 'Chembur–Ghatkopar', areas: [
    { slug: 'chembur', name: 'Chembur', aliases: ['Chembur East', 'Chembur West', 'Chembur Colony', 'Diamond Garden', 'Collectors Colony', 'Suman Nagar', 'Chedda Nagar', 'Basant Park', 'Sindhi Society', 'Shell Colony', 'Trombay', 'Anushakti Nagar', 'Mahul'] },
    { slug: 'tilak-nagar', name: 'Tilak Nagar', aliases: ['Tilaknagar', 'Tilak Nagar Chembur', 'Tilak Nagar Kurla'] },
    { slug: 'ghatkopar-east', name: 'Ghatkopar East', aliases: ['Ghatkopar E', 'Pant Nagar', 'Garodia Nagar', 'Rajawadi', 'Ghatkopar'] },
    { slug: 'ghatkopar-west', name: 'Ghatkopar West', aliases: ['Ghatkopar W', 'Asalpha', 'Jagdusha Nagar', 'Amrut Nagar', 'Bhatwadi', 'Jagruti Nagar', 'Ghatkopar'] },
    { slug: 'kurla-west', name: 'Kurla West', aliases: ['Kurla W', 'Kamani', 'Bail Bazar', 'Halav Pool', 'Kohinoor City', 'Premier Residencies', 'Kurla'] },
    { slug: 'kurla-east', name: 'Kurla East', aliases: ['Kurla E', 'Nehru Nagar Kurla', 'Kurla'] },
    { slug: 'vidyavihar', name: 'Vidyavihar', aliases: ['Vidya Vihar', 'Vidyavihar East', 'Vidyavihar West'] },
    { slug: 'chunabhatti', name: 'Chunabhatti', aliases: ['Chuna Bhatti'] },
    { slug: 'deonar', name: 'Deonar', aliases: ['Deonar Farm Road'] },
    { slug: 'govandi', name: 'Govandi', aliases: ['Govandi East', 'Govandi West'] },
    { slug: 'mankhurd', name: 'Mankhurd', aliases: ['Mankhurd East', 'Mankhurd West'] },
  ] },
  { slug: 'thane', name: 'Thane', areas: [
    { slug: 'thane-west', name: 'Thane West', aliases: ['Thane W', 'Thane (W)', 'Thane'], areas: [
      { slug: 'naupada', name: 'Naupada', aliases: ['Thane Station', 'Thane Station West', 'Gokhale Road', 'Ram Maruti Road', 'Charai', 'Panch Pakhadi'] },
      { slug: 'ghodbunder-road', name: 'Ghodbunder Road', aliases: ['GB Road', 'Ghodbunder', 'Owale', 'Kavesar', 'Anand Nagar Thane', 'Bhayanderpada', 'Waghbil', 'Brahmand'] },
      { slug: 'hiranandani-estate', name: 'Hiranandani Estate', aliases: ['Hiranandani Estate Thane', 'Patlipada', 'Rodas Enclave', 'Hiranandani'] },
      { slug: 'manpada', name: 'Manpada', aliases: ['Tikujiniwadi', 'Manpada Road'] },
      { slug: 'kasarvadavali', name: 'Kasarvadavali', aliases: ['Kasarvadavli', 'Kasarwadavali'] },
      { slug: 'kolshet-road', name: 'Kolshet Road', aliases: ['Kolshet', 'Dhokali'] },
      { slug: 'balkum', name: 'Balkum', aliases: ['Balkum Pada', 'Balkum Naka'] },
      { slug: 'majiwada', name: 'Majiwada', aliases: ['Majiwade', 'Kapurbawdi', 'Kapur Bawdi'] },
      { slug: 'pokhran-road', name: 'Pokhran Road', aliases: ['Pokhran Road No 1', 'Pokhran Road No 2', 'Pokhran Road 1', 'Pokhran Road 2', 'Upvan', 'Upvan Lake Road'] },
      { slug: 'vasant-vihar', name: 'Vasant Vihar', aliases: ['Vasant Vihar Thane'] },
      { slug: 'vartak-nagar', name: 'Vartak Nagar', aliases: ['Wagle Estate', 'Wagle'] },
    ] },
    { slug: 'thane-east', name: 'Thane East', aliases: ['Thane E', 'Thane (E)', 'Kopri', 'Thane'] },
    { slug: 'kalwa', name: 'Kalwa', aliases: ['Kalwa West', 'Kalwa East'] },
    { slug: 'mumbra-diva', name: 'Mumbra–Diva', aliases: ['Mumbra', 'Diva', 'Kausa', 'Mumbra Kausa', 'Diva Junction'] },
  ] },
  { slug: 'navi-mumbai', name: 'Navi Mumbai', areas: [
    { slug: 'airoli', name: 'Airoli', aliases: ['Airoli Sector', 'Rabale'] },
    { slug: 'digha-gaon', name: 'Digha Gaon', aliases: ['Digha', 'Dighe'] },
    { slug: 'ghansoli', name: 'Ghansoli', aliases: ['Ghansoli West', 'Ghansoli Gaon', 'Mahape'] },
    { slug: 'kopar-khairane', name: 'Kopar Khairane', aliases: ['Koparkhairane', 'Koparkhairne', 'Kopar Khairne'] },
    { slug: 'vashi', name: 'Vashi', aliases: ['Vashi Sector 17', 'Vashi Gaon', 'Turbhe'] },
    { slug: 'sanpada', name: 'Sanpada', aliases: ['Sanpada Sector'] },
    { slug: 'juinagar', name: 'Juinagar', aliases: ['Jui Nagar'] },
    { slug: 'nerul', name: 'Nerul', aliases: ['Nerul East', 'Nerul West'] },
    { slug: 'seawoods', name: 'Seawoods', aliases: ['Sea Woods', 'Darave', 'Karave Nagar', 'Seawoods Darave'] },
    { slug: 'cbd-belapur', name: 'CBD Belapur', aliases: ['Belapur', 'CBD', 'Belapur CBD'] },
    { slug: 'kharghar', name: 'Kharghar', aliases: ['Kharghar Sector 11', 'Kharghar Sector 27', 'Kharghar Sector 34', 'Kharghar Sector 36'] },
    { slug: 'mansarovar', name: 'Mansarovar' },
    { slug: 'khandeshwar', name: 'Khandeshwar' },
    { slug: 'kamothe', name: 'Kamothe', aliases: ['Kamothe Sector'] },
    { slug: 'kalamboli', name: 'Kalamboli', aliases: ['Kalamboli Sector'] },
    { slug: 'panvel', name: 'Panvel', aliases: ['New Panvel', 'New Panvel East', 'New Panvel West', 'Old Panvel', 'Karanjade', 'Khanda Colony'] },
    { slug: 'ulwe', name: 'Ulwe', aliases: ['Ulwe Sector', 'Ulwe Node', 'Pushpak Nagar', 'Dronagiri'] },
    { slug: 'taloja', name: 'Taloja', aliases: ['Taloja Phase 1', 'Taloja Phase 2', 'Pendhar', 'Taloja MIDC'] },
  ] },
]

const rows = (list: AreaSeed[], parentSlug: string | null = null): (typeof areas.$inferInsert)[] =>
  list.flatMap(({ areas: children = [], ...area }) => [{ ...area, parentSlug }, ...rows(children, area.slug)])

export async function seedAreas(db: Db) {
  await db.insert(areas).values(rows(AREAS).map((row, i) => ({ ...row, sortOrder: i + 1 })))
    .onConflictDoUpdate({
      target: areas.slug,
      set: { name: sql`excluded.name`, parentSlug: sql`excluded.parent_slug`, aliases: sql`excluded.aliases`, sortOrder: sql`excluded.sort_order` },
    })
}
