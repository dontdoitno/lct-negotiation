import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { LANDING } from "@/lib/flow/copy";
import { CallPreview } from "@/components/landing/CallPreview";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-wide flex-1 px-6 py-12">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,660px)]">
          <div>
            <Heading level={1} type="display-1">
              {LANDING.title}
            </Heading>
            <div className="mt-5 max-w-reading">
              <Text as="p" display="block" type="large" color="secondary">
                {LANDING.subtitle}
              </Text>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {/* Next's Link keeps client-side navigation; the Button inside
                  carries the styling from the design system. */}
              <Link href="/quiz">
                <Button variant="primary" size="lg" label={LANDING.primaryCta} />
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" label={LANDING.secondaryCta} />
              </Link>
            </div>
          </div>

          {/* Preview is decoration: below 768px it drops out entirely rather
              than squeezing the hero into an unreadable column. */}
          <div className="hidden md:block">
            <CallPreview />
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {LANDING.values.map((v) => (
            <Card key={v.title}>
              <Heading level={2}>{v.title}</Heading>
              <div className="mt-2">
                <Text as="p" display="block" color="secondary">
                  {v.text}
                </Text>
              </div>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t-[1.5px] border-border">
        <div className="mx-auto flex max-w-wide items-center justify-between px-6 py-5">
          <Text type="supporting">{LANDING.productName}</Text>
          <Text type="supporting">{new Date().getFullYear()}</Text>
        </div>
      </footer>
    </div>
  );
}
