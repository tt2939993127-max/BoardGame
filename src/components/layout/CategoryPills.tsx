import { useTranslation } from 'react-i18next';

export type Category = 'All' | 'strategy' | 'casual' | 'party' | 'abstract' | 'tools';

interface CategoryPillsProps {
    activeCategory: Category;
    onSelect: (category: Category) => void;
}

const categories: Category[] = ['All', 'strategy', 'casual', 'party', 'abstract', 'tools'];

const categoryLabelKeys: Record<Category, string> = {
    All: 'category.all',
    strategy: 'category.strategy',
    casual: 'category.casual',
    party: 'category.party',
    abstract: 'category.abstract',
    tools: 'category.tools',
};

export const CategoryPills = ({ activeCategory, onSelect }: CategoryPillsProps) => {
    const { t } = useTranslation('common');

    return (
        <div className="flex justify-center w-full">
            <div className="flex items-center gap-6 font-serif overflow-x-auto no-scrollbar px-6 max-w-full">
                {categories.map((category) => {
                    const isActive = activeCategory === category;
                    return (
                        <button
                            key={category}
                            onClick={() => onSelect(category)}
                            className={`
                                relative text-sm tracking-wide transition-all duration-300 cursor-pointer whitespace-nowrap py-1
                                ${isActive
                                    ? 'text-[#433422] font-bold'
                                    : 'text-[#8c7b64] hover:text-[#433422]'
                                }
                            `}
                        >
                            <span className="relative z-10 px-1">
                                {t(categoryLabelKeys[category])}
                            </span>

                            {/* Underline for active state */}
                            {isActive && (
                                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#433422]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
