import { useSearchParams } from 'react-router-dom';
import { Home } from './Home';
import { HomeV2Draft } from './HomeV2Draft';

const isHomeV2DraftEnabled = import.meta.env.VITE_HOME_V2_DRAFT === '1';

export const HomeEntry = () => {
    const [searchParams] = useSearchParams();

    if (searchParams.get('homeV2Draft') === '1' || isHomeV2DraftEnabled) {
        return <HomeV2Draft />;
    }

    return <Home />;
};
