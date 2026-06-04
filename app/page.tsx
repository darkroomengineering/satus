import { redirect } from 'next/navigation'

/**
 * Satus ships no bespoke marketing homepage — that lived at
 * satus.darkroom.engineering and was retired once oss.darkroom.engineering
 * launched. `/` forwards to the live component library so a freshly scaffolded
 * project still boots to something that demonstrates the kit.
 *
 * When building on Satus, replace this file with your own homepage.
 */
export default function Home() {
  redirect('/components')
}
