import AIFinOps from '@/components/sections/AIFinOps';
import AlertsForecast from '@/components/sections/AlertsForecast';
import HealthReport from '@/components/sections/HealthReport';
import BTPMonitoring from '@/components/sections/BTPMonitoring';

export default function AIBTPPage() {
  return (
    <>
      <AIFinOps />
      <AlertsForecast />
      <HealthReport />
      <BTPMonitoring />
    </>
  );
}
