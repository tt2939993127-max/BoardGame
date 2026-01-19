import clsx from 'clsx';


export type Category = 'All' | 'Strategy' | 'Casual' | 'Party' | 'Abstract';

interface CategoryPillsProps {
    activeCategory: Category;
    onSelect: (category: Category) => void;
}

const CATEGORIES: Category[] = ['All', 'Strategy', 'Casual', 'Party', 'Abstract'];

const CATEGORY_NAMES: Record<Category, string> = {
    'All': '全部游戏',
    'Strategy': '策略',
    'Casual': '休闲',
    'Party': '派对',
    'Abstract': '抽象'
};

export const CategoryPills = ({ activeCategory, onSelect }: CategoryPillsProps) => {
    return (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 no-scrollbar mask-gradient-x">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={clsx(
                        'px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap',
                        'border active:scale-95',
                        activeCategory === cat
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800 hover:shadow-sm'
                    )}
                >
                    {CATEGORY_NAMES[cat]}
                </button>
            ))}
        </div>
    );
};
