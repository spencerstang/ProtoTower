import Link from "next/link";
import { UnavailableState } from "@protostack/ui";

export default function UnavailablePage() {
  return (
    <UnavailableState
      title="This capability is not enabled"
      description="Future ProtoStack product features remain disabled until their own reviewed milestones."
      action={
        <Link className="primary-action" href="/">
          Return home
        </Link>
      }
    />
  );
}
