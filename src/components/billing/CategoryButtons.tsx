import { CATEGORIES } from '../../types';
import { useStore } from '../../store/useStore';

export function CategoryButtons() {
  const { selectedCategory, setSelectedCategory } = useStore();

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-slate-500 mb-2">Categories</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`h-8 px-3 text-xs font-medium rounded-md transition-colors ${
            selectedCategory === null
              ? 'bg-green-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`h-8 px-3 text-xs font-medium rounded-md transition-colors ${
              selectedCategory === category
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
