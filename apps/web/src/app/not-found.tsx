import Link from "next/link";
import { UnavailableState } from "@protostack/ui";

export default function NotFound() {
  return (
    <UnavailableState
      title="Page not found"
      description="This page is not part of the published ProtoTower catalog."
      action={
        <Link className="primary-action" href="/">
          Return home
        </Link>
      }
    />
  );
}
