export type Category = 'All' | '策略' | '休闲' | '派对' | '抽象';

interface CategoryPillsProps {
    activeCategory: Category;
    onSelect: (category: Category) => void;
}

const categories: Category[] = ['All', '策略', '休闲', '派对', '抽象'];

// 转换为中文显示
const getCategoryLabel = (cat: Category): string => {
    if (cat === 'All') return '全部游戏';
    return cat;
};

export const CategoryPills = ({ activeCategory, onSelect }: CategoryPillsProps) => {
    return (
        <div className="flex items-center gap-6 font-serif">
            {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                    <button
                        key={category}
                        onClick={() => onSelect(category)}
                        className={`
                            relative text-sm tracking-wide transition-all duration-300 cursor-pointer
                            ${isActive
                                ? 'text-[#433422] font-bold'
                                : 'text-[#8c7b64] hover:text-[#433422]'
                            }
                        `}
                    >
                        <span className="relative z-10">
                            {getCategoryLabel(category)}
                        </span>

                        {/* Underline for active state */}
                        {isActive && (
                            <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-[#433422]" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
