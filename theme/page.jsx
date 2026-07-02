import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { LogoMarquee } from "@/components/logo-marquee"
import { FaceoffTracks } from "@/components/faceoff-tracks"
import { CoopRaids } from "@/components/coop-raids"
import { Leaderboard } from "@/components/leaderboard"
import { CtaSection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <LogoMarquee />
        <FaceoffTracks />
        <CoopRaids />
        <Leaderboard />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
