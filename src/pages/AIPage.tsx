import AIFinOps from '@/components/sections/AIFinOps';
import AlertsForecast from '@/components/sections/AlertsForecast';
import HealthReport from '@/components/sections/HealthReport';

export default function AIPage() {
  return (
    <>
      <AIFinOps />
      <AlertsForecast />
      <HealthReport />
    </>
  );
}
