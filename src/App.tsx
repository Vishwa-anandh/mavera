import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';
import { ConfirmProvider } from './components/ConfirmProvider';

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <ConfirmProvider>
          <div>Mavera</div>
        </ConfirmProvider>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
