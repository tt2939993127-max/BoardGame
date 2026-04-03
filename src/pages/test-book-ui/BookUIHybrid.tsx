import React, { useMemo, useState } from 'react';

type BookPage = {
    title: string;
    body: string;
};

type BookEntry = {
    id: string;
    title: string;
    subtitle: string;
    summary: string;
    accent: string;
    pages: BookPage[];
};

const BOOKS: BookEntry[] = [
    {
        id: 'smashup',
        title: '大杀四方',
        subtitle: 'Smash Up',
        summary: '混搭派系、抢基地、用连锁节奏打出爆点。',
        accent: '#8b5a2b',
        pages: [
            {
                title: '游戏气质',
                body: '这本更像一场热闹的混战。重点不是单卡强度，而是两个派系拼起来以后能不能形成让人拍桌子的连锁。'
            },
            {
                title: '适合谁',
                body: '适合喜欢组合技、回合爆发和局后复盘的人。第一次体验时，建议直接从差异大的派系开始。'
            },
        ],
    },
    {
        id: 'dicethrone',
        title: '王权骰铸',
        subtitle: 'Dice Throne',
        summary: '英雄决斗、掷骰抉择、升级和爆发并存。',
        accent: '#3f6f57',
        pages: [
            {
                title: '游戏气质',
                body: '它不是单纯拼运气。每次保留哪些骰面、什么时候升级技能、什么时候反打，都会直接决定对局张力。'
            },
            {
                title: '适合谁',
                body: '适合喜欢角色风格明显、回合短促、但每个选择都能看出水平差异的玩家。'
            },
        ],
    },
    {
        id: 'summonerwars',
        title: '召唤师战争',
        subtitle: 'Summoner Wars',
        summary: '更强调站位、前线推进和空间压制。',
        accent: '#495f97',
        pages: [
            {
                title: '游戏气质',
                body: '它像一本战线手册。每一次召唤、每一个走位，都会改变整盘局面的空间关系。'
            },
            {
                title: '适合谁',
                body: '适合喜欢慢慢建立优势、用位置和节奏压住对手的人。'
            },
        ],
    },
    {
        id: 'tictactoe',
        title: '井字棋',
        subtitle: 'Tic Tac Toe',
        summary: '轻量、快速、适合随时开一局。',
        accent: '#8a4f44',
        pages: [
            {
                title: '游戏气质',
                body: '它很短，但不该被做得很随便。这个入口更强调“几秒内就知道能玩什么”。'
            },
            {
                title: '适合谁',
                body: '适合热身、收尾、等人时快速开局，也适合验证轻量游戏入口的可读性。'
            },
        ],
    },
];

export function BookUIHybrid() {
    const [selectedBookId, setSelectedBookId] = useState<string>(BOOKS[0].id);
    const [pageIndex, setPageIndex] = useState(0);

    const selectedBook = useMemo(
        () => BOOKS.find(book => book.id === selectedBookId) ?? BOOKS[0],
        [selectedBookId]
    );

    const currentPage = selectedBook.pages[pageIndex];

    const openBook = (bookId: string) => {
        setSelectedBookId(bookId);
        setPageIndex(0);
    };

    const goPrev = () => {
        setPageIndex(current => Math.max(current - 1, 0));
    };

    const goNext = () => {
        setPageIndex(current => Math.min(current + 1, selectedBook.pages.length - 1));
    };

    return (
        <main className="min-h-screen bg-[#201812] px-6 py-8 text-[#f3e7d3]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
                <header className="flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a575]">
                        Book Hybrid
                    </p>
                    <h1 className="text-4xl font-bold">可运行的书架入口页</h1>
                    <p className="max-w-3xl text-sm leading-6 text-[#d9c5ab]">
                        当前目标只保留 `book-hybrid` 并确保路由可运行，因此这里使用纯 DOM 实现一个稳定版本：
                        左侧是书架选择，右侧是打开后的书页内容，不再依赖 WebGL 或实验性材质文件。
                    </p>
                </header>

                <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="rounded-3xl border border-[#4b372a] bg-[#2a1f18] p-5 shadow-2xl">
                        <div className="mb-4 text-sm font-semibold text-[#d7b483]">书架</div>
                        <div className="grid gap-3">
                            {BOOKS.map(book => {
                                const isActive = book.id === selectedBook.id;
                                return (
                                    <button
                                        key={book.id}
                                        type="button"
                                        onClick={() => openBook(book.id)}
                                        className="rounded-2xl border px-4 py-4 text-left transition"
                                        style={{
                                            borderColor: isActive ? book.accent : '#4b372a',
                                            backgroundColor: isActive ? '#38291f' : '#241a15',
                                            boxShadow: isActive ? `inset 4px 0 0 ${book.accent}` : 'none',
                                        }}
                                    >
                                        <div className="text-lg font-semibold">{book.title}</div>
                                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[#cba97b]">
                                            {book.subtitle}
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[#dbc8af]">
                                            {book.summary}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="rounded-[2rem] border border-[#5a4432] bg-[#3a2b20] p-4 shadow-2xl">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <article className="rounded-[1.5rem] bg-[#eadcc1] p-6 text-[#4d3422] shadow-inner">
                                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6847]">
                                    {selectedBook.title}
                                </div>
                                <h2 className="mt-4 text-3xl font-bold">{currentPage.title}</h2>
                                <p className="mt-6 text-base leading-8">{currentPage.body}</p>
                            </article>

                            <article className="rounded-[1.5rem] bg-[#f2e7d1] p-6 text-[#4d3422] shadow-inner">
                                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6847]">
                                    书页摘要
                                </div>
                                <h2 className="mt-4 text-3xl font-bold">{selectedBook.subtitle}</h2>
                                <p className="mt-6 text-base leading-8">{selectedBook.summary}</p>

                                <div className="mt-8 rounded-2xl bg-[#e5d4b4] p-4">
                                    <div className="text-sm font-semibold">当前状态</div>
                                    <ul className="mt-3 space-y-2 text-sm leading-6">
                                        <li>当前书籍：{selectedBook.title}</li>
                                        <li>当前页码：{pageIndex + 1} / {selectedBook.pages.length}</li>
                                        <li>路由：`/dev/book-hybrid`</li>
                                    </ul>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        disabled={pageIndex === 0}
                                        className="rounded-full bg-[#5a3d28] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        disabled={pageIndex >= selectedBook.pages.length - 1}
                                        className="rounded-full bg-[#8b5a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        下一页
                                    </button>
                                    <a
                                        href="/"
                                        className="rounded-full border border-[#8b6847] px-5 py-3 text-sm font-semibold text-[#4d3422]"
                                    >
                                        返回首页
                                    </a>
                                </div>
                            </article>
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}

export default BookUIHybrid;
