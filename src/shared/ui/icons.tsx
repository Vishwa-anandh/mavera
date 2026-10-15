import type { SVGProps } from 'react';
import { fintoryIconBodies, type FintoryIconName } from './fintoryIconBodies';

/** Fintory Universal Icon Set (Line) rendered inline so icons inherit Mavera's token-driven
 * colour (currentColor) and keep one SVG element contract throughout the interface. */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & { size?: number };

function MaveraIcon({ name, size = 20, ...props }: IconProps & { name: FintoryIconName }) {
  return (
    <svg
      width={`${size / 16}rem`}
      height={`${size / 16}rem`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
      dangerouslySetInnerHTML={{ __html: fintoryIconBodies[name] }}
    />
  );
}

function icon(name: FintoryIconName) {
  return function MaveraIconComponent(props: IconProps) {
    return <MaveraIcon name={name} {...props} />;
  };
}

export const SearchIcon = icon('search');
export const BellIcon = icon('bell');
export const SparkleIcon = icon('sparkle');
export const ChevronDownIcon = icon('chevronDown');
export const MenuIcon = icon('menu');
export const CloseIcon = icon('close');
export const LockIcon = icon('lock');
export const ServerIcon = icon('server');
export const CloudIcon = icon('cloud');
export const SwapIcon = icon('swap');
export const HomeIcon = icon('home');
export const ReportIcon = icon('report');
export const CrownIcon = icon('crown');
export const HeadsetIcon = icon('headset');
export const FileTextIcon = icon('fileText');
export const SettingsIcon = icon('settings');
export const GridIcon = icon('grid');
export const HelpIcon = icon('help');
export const RefreshIcon = icon('refresh');
export const ChevronRightIcon = icon('chevronRight');
export const ChevronLeftIcon = icon('chevronLeft');
export const PencilIcon = icon('pencil');
export const EyeIcon = icon('eye');
export const EyeSlashIcon = icon('eyeSlash');
export const TrashIcon = icon('trash');
export const PlusIcon = icon('plus');
export const CheckIcon = icon('check');
export const CreditCardIcon = icon('creditCard');
export const TrendUpIcon = icon('trendUp');
export const TrendDownIcon = icon('trendDown');
export const ShieldIcon = icon('shield');
export const BuildingIcon = icon('building');
export const UsersIcon = icon('users');
export const AlertTriangleIcon = icon('alertTriangle');
export const InfoIcon = icon('info');
export const LightbulbIcon = icon('lightbulb');
export const ClockIcon = icon('clock');
export const TargetIcon = icon('target');
export const PiggyBankIcon = icon('piggyBank');
export const UserIcon = icon('user');
export const StarIcon = icon('star');
export const PrinterIcon = icon('printer');
export const UploadIcon = icon('upload');
export const MailIcon = icon('mail');
export const FilterIcon = icon('filter');
export const PercentIcon = icon('percent');
export const HierarchyIcon = icon('hierarchy');
export const PersonXIcon = icon('personX');
export const SendIcon = icon('send');
