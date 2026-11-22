import { saveLibraryBlockNote } from "@/app/towers/actions";
import type { PersonalTower, TowerItem } from "@protostack/tower-engine";

export function LibraryBlockNoteForm({
  tower,
  item,
  title,
}: {
  tower: PersonalTower;
  item: TowerItem;
  title: string;
}) {
  const fieldId = `library-note-${item.protocolId}`;
  return (
    <form action={saveLibraryBlockNote} className="stacked-form">
      <input type="hidden" name="towerId" value={tower.id} />
      <input type="hidden" name="revision" value={tower.revision} />
      <input type="hidden" name="protocolId" value={item.protocolId} />
      <input type="hidden" name="protocolVersion" value={item.protocolVersion} />
      <label htmlFor={fieldId}>My version of library block {title} (optional)</label>
      <textarea
        id={fieldId}
        name="personalNote"
        maxLength={280}
        rows={2}
        defaultValue={item.personalNote ?? ""}
      />
      <button className="secondary-action" type="submit">
        Save my version: {title}
      </button>
    </form>
  );
}
