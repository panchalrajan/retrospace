import { WorkBoard, WorkBoardColumn, WorkItemCard } from "@/features/work/work-board";
import items from "@/features/work/mock-work-items.json";
const columns = [
  { title: "Kudos", count: 3, summaries: ["A smooth release, together.", "Thoughtful code reviews.", "Great support handoffs."] },
  { title: "Liked", count: 2, summaries: ["Pairing made work easier.", "Clear daily updates."] },
  { title: "Learned", count: 2, summaries: ["Small releases reduce risk.", "Test edge cases early."] },
];
/** A static illustration built from the workspace's shared surface components. */
export default function BoardPreview() {
  return <WorkBoard readOnly>{columns.map(column => {
    const cards = items.filter(item => item.status === column.title).slice(0, column.count);
    return <WorkBoardColumn readOnly key={column.title} title={column.title} count={cards.length}>
      {cards.map((item, index) => <WorkItemCard readOnly key={item.key} id={item.key} title={column.summaries[index]} person={item.createdBy} personLabel="Created by" votes={item.votes} comments={item.comments ?? []} />)}
    </WorkBoardColumn>;
  })}</WorkBoard>;
}
