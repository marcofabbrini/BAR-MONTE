
import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    filled?: boolean;
    className?: string;
}

const EmojiIcon = ({ emoji, className, ...props }: { emoji: string } & IconProps) => (
    <span 
        role="img" 
        aria-label="icon" 
        className={`inline-flex items-center justify-center leading-none select-none not-italic ${className || ''}`}
        style={{ fontSize: '1.2em' }} // Leggermente più grande del testo circostante per leggibilità
        {...props}
    >
        {emoji}
    </span>
);

export const BackArrowIcon = (props: IconProps) => <EmojiIcon emoji="🔙" {...props} />;
export const EditIcon = (props: IconProps) => <EmojiIcon emoji="✏️" {...props} />;
export const TrashIcon = (props: IconProps) => <EmojiIcon emoji="🗑️" {...props} />;
export const PlusIcon = (props: IconProps) => <EmojiIcon emoji="➕" {...props} />;
export const SaveIcon = (props: IconProps) => <EmojiIcon emoji="💾" {...props} />;
export const InventoryIcon = (props: IconProps) => <EmojiIcon emoji="📦" {...props} />;
export const StaffIcon = (props: IconProps) => <EmojiIcon emoji="👥" {...props} />;
export const StatsIcon = (props: IconProps) => <EmojiIcon emoji="📊" {...props} />;
export const LightbulbIcon = (props: IconProps) => <EmojiIcon emoji="💡" {...props} />;
export const StarIcon = (props: IconProps) => <EmojiIcon emoji="⭐" {...props} />;
export const LogoIcon = (props: IconProps) => <EmojiIcon emoji="☕" {...props} />;
export const ChartBarIcon = (props: IconProps) => <EmojiIcon emoji="📈" {...props} />;
export const LockIcon = (props: IconProps) => <EmojiIcon emoji="🔒" {...props} />;
export const LockOpenIcon = (props: IconProps) => <EmojiIcon emoji="🔓" {...props} />;
export const CheckIcon = (props: IconProps) => <EmojiIcon emoji="✅" {...props} />;
export const SettingsIcon = (props: IconProps) => <EmojiIcon emoji="⚙️" {...props} />;
export const CashIcon = (props: IconProps) => <EmojiIcon emoji="💶" {...props} />;
export const BanknoteIcon = (props: IconProps) => <EmojiIcon emoji="💰" {...props} />;
export const ListIcon = (props: IconProps) => <EmojiIcon emoji="📝" {...props} />;
export const BoxIcon = (props: IconProps) => <EmojiIcon emoji="📦" {...props} />;
export const GoogleIcon = (props: IconProps) => <EmojiIcon emoji="🔑" {...props} />;
export const UserPlusIcon = (props: IconProps) => <EmojiIcon emoji="👤➕" {...props} />;
export const TicketIcon = (props: IconProps) => <EmojiIcon emoji="🎟️" {...props} />;
export const TrophyIcon = (props: IconProps) => <EmojiIcon emoji="🏆" {...props} />;
export const GridIcon = (props: IconProps) => <EmojiIcon emoji="🔢" {...props} />;
export const SparklesIcon = (props: IconProps) => <EmojiIcon emoji="✨" {...props} />;
export const SortIcon = (props: IconProps) => <EmojiIcon emoji="⇅" {...props} />;
export const FilterIcon = (props: IconProps) => <EmojiIcon emoji="🔍" {...props} />;
export const CalendarIcon = (props: IconProps) => <EmojiIcon emoji="📅" {...props} />;
export const GamepadIcon = (props: IconProps) => <EmojiIcon emoji="🎮" {...props} />;
export const UsersIcon = (props: IconProps) => <EmojiIcon emoji="👥" {...props} />;
export const TruckIcon = (props: IconProps) => <EmojiIcon emoji="🚒" {...props} />;
export const DropletIcon = (props: IconProps) => <EmojiIcon emoji="💧" {...props} />;
export const LayersIcon = (props: IconProps) => <EmojiIcon emoji="📚" {...props} />;
export const CloverIcon = (props: IconProps) => <EmojiIcon emoji="🍀" {...props} />;
export const BallIcon = (props: IconProps) => <EmojiIcon emoji="🎱" {...props} />;
export const SunIcon = (props: IconProps) => <EmojiIcon emoji="☀️" {...props} />;
export const CloudSunIcon = (props: IconProps) => <EmojiIcon emoji="⛅" {...props} />;
export const RainIcon = (props: IconProps) => <EmojiIcon emoji="🌧️" {...props} />;
export const SnowIcon = (props: IconProps) => <EmojiIcon emoji="❄️" {...props} />;
export const BoltIcon = (props: IconProps) => <EmojiIcon emoji="⚡" {...props} />;
export const DiceIcon = (props: IconProps) => <EmojiIcon emoji="🎲" {...props} />;
export const InfoIcon = (props: IconProps) => <EmojiIcon emoji="ℹ️" {...props} />;
export const WalletIcon = (props: IconProps) => <EmojiIcon emoji="👛" {...props} />;
export const ClipboardIcon = (props: IconProps) => <EmojiIcon emoji="📋" {...props} />;
export const PrinterIcon = (props: IconProps) => <EmojiIcon emoji="🖨️" {...props} />;
export const EyeIcon = (props: IconProps) => <EmojiIcon emoji="👁️" {...props} />;
export const BellIcon = (props: IconProps) => <EmojiIcon emoji="🔔" {...props} />;
export const MegaphoneIcon = (props: IconProps) => <EmojiIcon emoji="📢" {...props} />;
