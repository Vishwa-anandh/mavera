import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './router/AppRoutes';

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
