import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./homepage.module.css";

export const metadata: Metadata = {
  description: "Set a goal. Test a method. Track what changes with ProtoTower.",
};

export default function LandingPage() {
  return (
    <main className={styles["homepage"]} id="main-content">
      <SiteHeader variant="homepage" />

      <section className={styles["hero"]} aria-labelledby="homepage-heading">
        <div className={styles["heroInner"]}>
          <div className={styles["intro"]}>
            <h1 id="homepage-heading">
              Find what works <br />
              for you.
            </h1>
            <p>Set a goal. Test a method. Track what changes.</p>
            <div className={styles["actions"]}>
              <Link className={styles["start"]} href="/towers/new">
                Start a tower
              </Link>
              <Link className={styles["browse"]} href="/protocols">
                Browse protocols <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className={styles["illustration"]}>
            <Image
              className={styles["tower"]}
              src="/precision-tower.webp"
              alt=""
              width={1024}
              height={1024}
              unoptimized
              fetchPriority="high"
            />
            <ol className={styles["labels"]} aria-label="Parts of a tower">
              <li>Goal</li>
              <li>Protocol</li>
              <li>Outcome</li>
            </ol>
          </div>
        </div>
      </section>

      <section className={styles["example"]} aria-labelledby="example-goal">
        <h2 id="example-goal">Remember more of what you read.</h2>
        <div className={styles["exampleDetails"]}>
          <p>Example tower</p>
          <dl>
            <div>
              <dt>Protocol</dt>
              <dd>Retrieval practice</dd>
              <dd>Close the book and write down what you remember.</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>Next-day recall</dd>
              <dd>Count how many key ideas you can recall the next day.</dd>
            </div>
          </dl>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
