import { useSearchParams } from 'react-router-dom';
import { Home } from './Home';
import { HomeV2Draft } from './HomeV2Draft';

export const HomeEntry = () => {
    const [searchParams] = useSearchParams();

    if (searchParams.get('homeV2Draft') === '1') {
        return <HomeV2Draft />;
    }

    return <Home />;
};
