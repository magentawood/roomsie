'use client'

import { useState } from 'react'
import type { User } from 'firebase/auth'
import { Building07, Home02, Home03, Key01, Plus, Trash01, UploadCloud02 } from '@untitledui/icons'
import type { AreasResponse, ListingEdit, ListingKind } from '@roomsie/contract'
import { labels } from '../../lib/listing-steps'
import { uploadPhoto } from '../../lib/upload'
import { Button } from '../ui/button'
import { ChoiceCard, ChoiceChips, MultiChips } from '../ui/choice'
import { Field, NumberInput, TextArea, TextInput, inputClass } from '../ui/field'
import { Checkbox, Toggle } from '../ui/toggle'

/** Free text is masked at save (PD17). The line under the field tells the lister. */
const masked = 'Phone numbers are hidden.'

export type StepProps = { kind: ListingKind; values: ListingEdit; set: (patch: ListingEdit) => void }

export const kindCards: { kind: ListingKind; icon: typeof Home02; title: string; subtitle: string }[] = [
  { kind: 'room_in_flat', icon: Home03, title: 'A room in my flat', subtitle: 'You live there and have a spot to fill' },
  { kind: 'owner_flat', icon: Home02, title: 'A whole flat or house I own', subtitle: 'Studio to bungalow, rented directly' },
  { kind: 'pg', icon: Building07, title: 'A PG or hostel I run', subtitle: 'Beds, meals and house rules' },
  { kind: 'broker_flat', icon: Key01, title: 'I’m a broker', subtitle: 'A flat I rent out for an owner, for a fee' },
]

/** Step 1. A listing that exists keeps its kind, so the other cards are off. */
export function KindStep({ kind, onPick }: { kind: ListingKind | null; onPick?: (kind: ListingKind) => void }) {
  return (
    <div role="radiogroup" aria-label="What are you listing?" className="grid gap-3 md:grid-cols-2">
      {kindCards.map((c) => (
        <ChoiceCard key={c.kind} icon={c.icon} title={c.title} subtitle={c.subtitle} selected={kind === c.kind} disabled={!onPick} onSelect={() => onPick?.(c.kind)} />
      ))}
    </div>
  )
}

export function WhereStep({ kind, values, set, areas }: StepProps & { areas: AreasResponse['areas'] }) {
  const areaLabels = Object.fromEntries(areas.map((a) => [a.slug, a.name]))
  return (
    <>
      {kind === 'pg' && <TextInput label="PG/Hostel Name" required value={values.pgName} onChange={(pgName) => set({ pgName })} placeholder="Name of your PG/Hostel" hint={masked} maxLength={80} />}
      <ChoiceChips label="Area" required labels={areaLabels} value={values.areaSlug} onChange={(areaSlug) => set({ areaSlug })} />
      <TextInput label="Address" value={values.address} onChange={(address) => set({ address })} placeholder="Flat no, wing, building, street, pincode" hint={`Only you see it, unless you share it below. ${masked}`} maxLength={200} />
      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <TextInput label="Building or society" value={values.building} onChange={(building) => set({ building })} placeholder="eg. Silver oak residency" hint={masked} maxLength={120} />
        <TextInput label="Street" value={values.street} onChange={(street) => set({ street })} placeholder="eg. lokhandwala road" hint={masked} maxLength={120} />
        <TextInput label="Nearest landmark" value={values.landmark} onChange={(landmark) => set({ landmark })} placeholder="eg. Opposite infinity mall, near lokhandwala" hint={masked} maxLength={120} />
        <Field label="Pincode">
          {(id) => (
            <input id={id} className={inputClass} inputMode="numeric" maxLength={6} placeholder="eg. 411028" value={values.pincode ?? ''}
              onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '') || null })} />
          )}
        </Field>
      </div>
      <Toggle title="Share my full address" help="Seekers see the area, the landmark and the building until you share." checked={values.shareAddress ?? false} onChange={(shareAddress) => set({ shareAddress })} />
    </>
  )
}

export function NearbyStep({ values, set }: StepProps) {
  const walk = (label: string, field: 'walkStation' | 'walkBus' | 'walkMarket' | 'walkGym' | 'walkMall') => (
    <ChoiceChips label={label} labels={labels.walkTime} value={values[field]} onChange={(v) => set({ [field]: v })} />
  )
  return (
    <>
      <TextInput label="Nearest Railway/Metro/Bus station" value={values.nearestStation} onChange={(nearestStation) => set({ nearestStation })} placeholder="eg. Andheri station, DN nagar metro" hint={masked} maxLength={120} />
      <div className="flex flex-col gap-1 border-t border-secondary pt-5">
        <h3 className="text-md font-semibold text-primary">Close or far?</h3>
        <p className="text-sm text-tertiary">The most asked question on roomsie.</p>
      </div>
      {walk('Railway/Metro station', 'walkStation')}
      {walk('Bus stop', 'walkBus')}
      {walk('Market or groceries', 'walkMarket')}
      {walk('Gym', 'walkGym')}
      {walk('Mall', 'walkMall')}
    </>
  )
}

/** Two chips for a yes or no field, in the order of the designs. */
function BoolChips({ label, first, second, value, onChange }: { label: string; first: [boolean, string]; second: [boolean, string]; value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  const key = (b: boolean) => (b === first[0] ? 'a' : 'b')
  return (
    <ChoiceChips label={label} labels={{ a: first[1], b: second[1] }} value={value == null ? null : key(value)}
      onChange={(v) => onChange(v === null ? null : v === 'a' ? first[0] : second[0])} />
  )
}

export function PlaceStep({ kind, values, set }: StepProps) {
  const flat = kind !== 'pg'
  return (
    <>
      {flat && <ChoiceChips label="Place type" labels={labels.placeType} value={values.placeType} onChange={(placeType) => set({ placeType })} />}
      {flat && <ChoiceChips label="Furnishing" labels={labels.furnishing} value={values.furnishing} onChange={(furnishing) => set({ furnishing })} />}
      {kind === 'room_in_flat' && <ChoiceChips label="The room" labels={labels.roomType} value={values.roomType} onChange={(roomType) => set({ roomType })} />}
      {!flat && <MultiChips label="Sharing" labels={labels.sharing} value={values.sharing} onChange={(sharing) => set({ sharing })} />}
      {!flat && <ChoiceChips label="Beds free right now" labels={labels.bedsFree} value={values.bedsFree} onChange={(bedsFree) => set({ bedsFree })} />}
      {!flat && <ChoiceChips label="Meals" labels={labels.meals} value={values.meals} onChange={(meals) => set({ meals })} />}
      {!flat && <ChoiceChips label="Curfew" labels={labels.curfew} value={values.curfew} onChange={(curfew) => set({ curfew })} />}
      <ChoiceChips label="Bathroom for this room" labels={labels.bathroom} value={values.bathroom} onChange={(bathroom) => set({ bathroom })} />
      {flat && (
        <div className="grid gap-5 md:grid-cols-2 md:gap-8">
          <NumberInput label="Floor" value={values.floor} onChange={(floor) => set({ floor })} placeholder="eg. 7" min={-3} max={200} />
          <NumberInput label="Carpet area (sq ft)" value={values.carpetAreaSqft} onChange={(carpetAreaSqft) => set({ carpetAreaSqft })} placeholder="eg. 750" min={1} />
        </div>
      )}
      <BoolChips label="Balcony" first={[true, 'Yes']} second={[false, 'No']} value={values.balcony} onChange={(balcony) => set({ balcony })} />
      <MultiChips label="What’s inside" labels={labels.insideItems} value={values.insideItems} onChange={(insideItems) => set({ insideItems })} />
      <MultiChips label="Building and society" labels={labels.amenities} value={values.amenities} onChange={(amenities) => set({ amenities })} />
    </>
  )
}

export function RentStep({ kind, values, set }: StepProps) {
  const rates = values.rates ?? []
  const flatRate = rates[0]
  const setFlatRate = (patch: { rent?: number | null; deposit?: number | null }) => {
    const rent = 'rent' in patch ? patch.rent : flatRate?.rent
    const deposit = 'deposit' in patch ? patch.deposit : flatRate?.deposit ?? null
    set({ rates: rent == null ? [] : [{ rent, deposit: deposit ?? null }] })
  }
  const setPgRate = (sharing: NonNullable<ListingEdit['sharing']>[number], patch: { rent?: number | null; deposit?: number | null }) => {
    const old = rates.find((r) => r.sharing === sharing)
    const rent = 'rent' in patch ? patch.rent : old?.rent
    const others = rates.filter((r) => r.sharing !== sharing)
    set({ rates: rent == null ? others : [...others, { sharing, rent, deposit: ('deposit' in patch ? patch.deposit : old?.deposit) ?? null }] })
  }
  return (
    <>
      {kind === 'pg' ? (
        (values.sharing ?? []).length ? (
          <div className="flex flex-col gap-4">
            {(values.sharing ?? []).map((sharing) => {
              const rate = rates.find((r) => r.sharing === sharing)
              return (
                <div key={sharing} className="flex flex-col gap-4 rounded-xl border border-secondary p-4">
                  <h3 className="text-sm font-semibold text-primary">For {labels.sharing[sharing]} sharing</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberInput label="Monthly rent (₹)" required value={rate?.rent} onChange={(rent) => setPgRate(sharing, { rent })} placeholder="eg. 15000" min={0} />
                    <NumberInput label="Security Deposit (₹)" value={rate?.deposit} onChange={(deposit) => setPgRate(sharing, { deposit })} placeholder="eg. 30000" min={0} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-md border border-secondary bg-secondary p-4 text-sm text-tertiary">Pick the sharing types on step 4 first. Each one gets its own rent.</p>
        )
      ) : (
        <div className="grid gap-5 md:grid-cols-2 md:gap-8">
          <NumberInput label="Monthly rent (₹)" required value={flatRate?.rent} onChange={(rent) => setFlatRate({ rent })} placeholder="eg. 15000" min={0} />
          <NumberInput label="Security Deposit (₹)" value={flatRate?.deposit} onChange={(deposit) => setFlatRate({ deposit })} placeholder="eg. 30000" min={0} />
          <NumberInput label="Maintenance per month (₹)" value={values.maintenance} onChange={(maintenance) => set({ maintenance })} placeholder="eg. 3000" min={0} />
          {kind === 'broker_flat' && <NumberInput label="Your Brokerage (₹)" required value={values.brokerage} onChange={(brokerage) => set({ brokerage })} placeholder="eg. 15000" min={0} />}
        </div>
      )}
      <BoolChips label="Maintenance" first={[true, 'Included in rent']} second={[false, 'Extra each month']} value={values.maintenanceIncluded} onChange={(maintenanceIncluded) => set({ maintenanceIncluded })} />
      <ChoiceChips label="Electricity" labels={labels.electricity} value={values.electricity} onChange={(electricity) => set({ electricity })} />
      <BoolChips label="Rent" first={[false, 'Fixed']} second={[true, 'Open to offers']} value={values.rentNegotiable} onChange={(rentNegotiable) => set({ rentNegotiable })} />
      {kind !== 'pg' && (
        <Field label="Available from">
          {(id) => <input id={id} type="date" className={inputClass} value={values.availableFrom ?? ''} onChange={(e) => set({ availableFrom: e.target.value || null })} />}
        </Field>
      )}
      <ChoiceChips label="Minimum Stay" labels={labels.minStay} value={values.minStay} onChange={(minStay) => set({ minStay })} />
    </>
  )
}

export function RulesStep({ kind, values, set }: StepProps) {
  return (
    <>
      <BoolChips label="Kitchen" first={[true, 'Veg Only']} second={[false, 'Non veg allowed']} value={values.vegOnlyKitchen} onChange={(vegOnlyKitchen) => set({ vegOnlyKitchen })} />
      <BoolChips label="Smoking" first={[false, 'No Smoking']} second={[true, 'Smoking is fine']} value={values.smokingAllowed} onChange={(smokingAllowed) => set({ smokingAllowed })} />
      <BoolChips label="Alcohol" first={[false, 'No Alcohol at home']} second={[true, 'Fine at home']} value={values.alcoholAllowed} onChange={(alcoholAllowed) => set({ alcoholAllowed })} />
      <ChoiceChips label="Guests" labels={labels.guests} value={values.guests} onChange={(guests) => set({ guests })} />
      <ChoiceChips label="Who can move in" labels={labels.whoCanMoveIn} value={values.whoCanMoveIn} onChange={(whoCanMoveIn) => set({ whoCanMoveIn })} />
      <MultiChips label="Who is welcome" labels={labels.whoIsWelcome} only={kind === 'room_in_flat' ? ['students', 'working_professionals'] : undefined}
        value={values.whoIsWelcome} onChange={(whoIsWelcome) => set({ whoIsWelcome })} />
    </>
  )
}

type Previews = Record<string, string>

/** One photo slot that uploads to R2 and shows the result. */
function PhotoPicker({ user, listingId, label, onUploaded }: { user: User; listingId: string; label: string; onUploaded: (key: string, preview: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-primary p-5 text-center hover:bg-primary_hover ${busy ? 'opacity-60' : ''}`}>
      <span className="flex size-10 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs"><UploadCloud02 size={20} aria-hidden /></span>
      <span className="text-sm"><span className="font-semibold text-secondary">{busy ? 'Uploading…' : label}</span></span>
      <span className="text-xs text-tertiary">PNG, JPG or WebP. We shrink it before the upload.</span>
      {error && <span className="text-xs text-error-primary">{error}</span>}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          setError(null)
          try {
            const { key, preview } = await uploadPhoto(user, listingId, file)
            onUploaded(key, preview)
          } catch {
            setError('The upload failed. Try again.')
          } finally {
            setBusy(false)
          }
        }} />
    </label>
  )
}

function Thumb({ src, onRemove, label }: { src?: string; onRemove: () => void; label: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-secondary bg-tertiary">
      {src && <img src={src} alt="" className="size-full object-cover" />}
      <button type="button" aria-label={label} onClick={onRemove} className="absolute top-2 right-2 rounded-md bg-primary p-1.5 text-fg-quaternary shadow-sm hover:text-fg-error">
        <Trash01 size={16} aria-hidden />
      </button>
    </div>
  )
}

export function PeopleStep({ values, set, user, listingId, previews, addPreview }: StepProps & { user: User; listingId: string; previews: Previews; addPreview: (key: string, url: string) => void }) {
  const mates = values.flatmates ?? []
  const update = (i: number, patch: Partial<(typeof mates)[number]>) => set({ flatmates: mates.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
  return (
    <>
      {mates.map((mate, i) => (
        <div key={i} className="flex flex-col gap-5 rounded-xl border border-secondary p-4 md:p-5">
          {mate.photoKey ? (
            <div className="w-24"><Thumb src={previews[mate.photoKey]} label={`Remove the photo of ${mate.name || 'this flatmate'}`} onRemove={() => update(i, { photoKey: null })} /></div>
          ) : (
            <PhotoPicker user={user} listingId={listingId} label="Add a photo" onUploaded={(key, url) => { addPreview(key, url); update(i, { photoKey: key }) }} />
          )}
          <div className="grid gap-5 md:grid-cols-2 md:gap-8">
            <TextInput label="Name" required value={mate.name} onChange={(name) => update(i, { name: name ?? '' })} placeholder="eg. Radhika" hint={masked} maxLength={60} />
            <NumberInput label="Age" value={mate.age} onChange={(age) => update(i, { age })} placeholder="eg. 24" min={18} max={99} />
            <TextInput label="What they do" value={mate.whatTheyDo} onChange={(whatTheyDo) => update(i, { whatTheyDo })} placeholder="eg. Business analyst" hint={masked} maxLength={80} />
            <Field label="Food">
              {(id) => (
                <select id={id} className={inputClass} value={mate.food ?? ''} onChange={(e) => update(i, { food: (e.target.value || null) as typeof mate.food })}>
                  <option value="">Choose</option>
                  {Object.entries(labels.food).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              )}
            </Field>
          </div>
          <div><Button variant="link-error" iconLeading={Trash01} onClick={() => set({ flatmates: mates.filter((_, j) => j !== i) })}>Delete Roommate</Button></div>
        </div>
      ))}
      {mates.length < 8 && (
        <div><Button variant="secondary" size="sm" iconLeading={Plus} onClick={() => set({ flatmates: [...mates, { name: '', age: null, whatTheyDo: null, food: null, photoKey: null }] })}>Add a roommate</Button></div>
      )}
      {mates.length > 0 && <Checkbox label="My flatmates agreed to be shown" required checked={values.flatmatesConsent ?? false} onChange={(flatmatesConsent) => set({ flatmatesConsent })} />}
    </>
  )
}

export function PhotosStep({ values, set, user, listingId, previews, addPreview }: StepProps & { user: User; listingId: string; previews: Previews; addPreview: (key: string, url: string) => void }) {
  const keys = values.photoKeys ?? []
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {keys.map((key, i) => <Thumb key={key} src={previews[key]} label={`Remove photo ${i + 1}`} onRemove={() => set({ photoKeys: keys.filter((k) => k !== key) })} />)}
      </div>
      {keys.length < 5 && <PhotoPicker user={user} listingId={listingId} label="Click to upload a photo" onUploaded={(key, url) => { addPreview(key, url); set({ photoKeys: [...keys, key] }) }} />}
      <TextArea label="Anything else you want the renter to know" value={values.description} onChange={(description) => set({ description })} placeholder="Enter a description" hint={masked} maxLength={2000} />
    </>
  )
}
