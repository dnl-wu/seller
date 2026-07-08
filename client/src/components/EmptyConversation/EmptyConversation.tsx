interface Suggestion {
  text: string;
  category: string;
}

const SUGGESTIONS: Suggestion[] = [
  { text: "I'm selling a used Sony camera.", category: "Electronics" },
  { text: "Help me list a winter jacket.", category: "Apparel" },
  { text: "I want to sell my old iPhone.", category: "Mobile" },
];

interface EmptyConversationProps {
  onSelectPrompt: (text: string) => void;
}

export function EmptyConversation({ onSelectPrompt }: EmptyConversationProps) {
  return (
    <div className="m-auto flex max-w-xl flex-col items-center gap-6 px-6 py-12 text-center">
      <div>
        <h2 className="font-serif text-3xl font-light text-primary-text md:text-4xl">
          List anything <span className="italic text-primary-accent">in minutes</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-secondary-text">
          Tell Seller what you have. It asks only what matters, then drafts a clean listing ready
          to post.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3">
        {SUGGESTIONS.map(({ text, category }) => (
          <button
            key={text}
            type="button"
            onClick={() => onSelectPrompt(text)}
            className="group rounded-lg border border-border bg-surface p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary-text">{category}</span>
              <span className="text-xs font-semibold text-primary-accent opacity-0 transition-opacity group-hover:opacity-100">
                Use prompt
              </span>
            </div>
            <p className="text-sm leading-snug text-primary-text">"{text}"</p>
          </button>
        ))}
      </div>
    </div>
  );
}
