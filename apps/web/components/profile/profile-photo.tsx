import { initials } from '../../lib/person'

/** The blue scalloped badge with a white tick of the designs ("Status icon", Verified tick). The paths are the export of Figma. */
export function VerifiedTick({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Verified" className={`text-fg-verified ${className}`}>
      <path fill="currentColor" d="M18.5332 4.25012C18.7611 4.80139 19.1987 5.23957 19.7496 5.46834L21.6814 6.26853C22.2327 6.4969 22.6708 6.93491 22.8991 7.48623C23.1275 8.03754 23.1275 8.65699 22.8991 9.2083L22.0995 11.1387C21.871 11.6903 21.8707 12.3104 22.1002 12.8617L22.8984 14.7915C23.0117 15.0646 23.0699 15.3573 23.07 15.6529C23.07 15.9485 23.0118 16.2412 22.8987 16.5143C22.7856 16.7874 22.6198 17.0355 22.4107 17.2445C22.2017 17.4535 21.9535 17.6192 21.6804 17.7323L19.7499 18.5319C19.1986 18.7598 18.7605 19.1973 18.5317 19.7483L17.7315 21.6801C17.5031 22.2314 17.0651 22.6694 16.5138 22.8978C15.9625 23.1262 15.343 23.1262 14.7917 22.8978L12.8613 22.0982C12.31 21.8704 11.6907 21.8708 11.1397 22.0995L9.20792 22.8985C8.65691 23.1263 8.038 23.1262 7.48713 22.898C6.93627 22.6698 6.4985 22.2323 6.26998 21.6816L5.46955 19.7492C5.24161 19.1979 4.80408 18.7597 4.25315 18.5309L2.32132 17.7308C1.77025 17.5025 1.33236 17.0648 1.10392 16.5138C0.875471 15.9628 0.875161 15.3436 1.10306 14.7924L1.90267 12.8619C2.13047 12.3106 2.13001 11.6914 1.90138 11.1404L1.10291 9.20717C0.989703 8.93411 0.93141 8.64142 0.931363 8.34582C0.931316 8.05023 0.989514 7.75752 1.10263 7.48443C1.21575 7.21133 1.38158 6.9632 1.59063 6.75422C1.79968 6.54524 2.04786 6.37949 2.32099 6.26646L4.25144 5.46684C4.80223 5.2391 5.24015 4.80213 5.46909 4.25183L6.26928 2.32C6.49764 1.76869 6.93566 1.33067 7.48697 1.10231C8.03829 0.873947 8.65774 0.873947 9.20905 1.10231L11.1395 1.90193C11.6908 2.12972 12.31 2.12926 12.861 1.90063L14.7937 1.10355C15.3449 0.875315 15.9642 0.875362 16.5154 1.10368C17.0666 1.33199 17.5046 1.76989 17.733 2.32106L18.5334 4.25346L18.5332 4.25012Z" />
      <path className="fill-(--background-color-primary)" fillRule="evenodd" clipRule="evenodd" d="M16.6999 8.85413C16.8602 8.6023 16.9139 8.29711 16.8492 8.00567C16.7845 7.71424 16.6067 7.46045 16.3549 7.30013C16.1031 7.1398 15.7979 7.08608 15.5064 7.15078C15.215 7.21548 14.9612 7.3933 14.8009 7.64513L10.3954 14.5676L8.37939 12.0476C8.19301 11.8145 7.92166 11.665 7.62502 11.6319C7.32838 11.5989 7.03077 11.685 6.79764 11.8714C6.56452 12.0578 6.41498 12.3291 6.38193 12.6257C6.34887 12.9224 6.43501 13.22 6.62139 13.4531L9.62139 17.2031C9.7332 17.3431 9.8768 17.4543 10.0402 17.5275C10.2037 17.6008 10.3823 17.6339 10.5611 17.6242C10.74 17.6146 10.9139 17.5623 11.0685 17.4718C11.2231 17.3814 11.3538 17.2553 11.4499 17.1041L16.6999 8.85413Z" />
    </svg>
  )
}

/**
 * The round photo of Profile and Settings: a white ring of 3 px (4 from `md`) with a thin line outside, the photo with a
 * thin line inside and a soft shadow, and the blue tick at the lower right for a verified person. 72 px, 96 from `md`.
 */
export function ProfilePhoto({ url, fullName, verified }: { url: string | null; fullName: string; verified: boolean }) {
  return (
    <span className="relative size-18 shrink-0 md:size-24">
      {/* Figma draws the outer line outside the box, so it is a ring that adds no size. */}
      <span className="flex size-full rounded-full bg-primary p-0.75 ring-1 ring-(color:--border-color-secondary_alt) md:p-1">
        <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-tertiary shadow-xl after:absolute after:inset-0 after:rounded-full after:inset-ring-[0.5px] after:inset-ring-(color:--border-color-avatar) md:after:inset-ring-[0.75px]">
          {url
            ? <img src={url} alt="" className="size-full object-cover" />
            : <span className="text-lg font-semibold text-tertiary">{initials(fullName)}</span>}
        </span>
      </span>
      {verified && <VerifiedTick className="absolute right-0.5 bottom-0.5 size-5 md:right-1 md:bottom-1 md:size-6" />}
    </span>
  )
}
