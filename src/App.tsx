import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <div>Mavera</div>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
