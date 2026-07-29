import Link from "next/link";
import { UnavailableState } from "@protostack/ui";

export default function NotFound() {
  return (
    <UnavailableState
      title="Page not found"
      description="This route is not part of the Milestone 1 application."
      action={
        <Link className="primary-action" href="/">
          Return home
        </Link>
      }
    />
  );
}
