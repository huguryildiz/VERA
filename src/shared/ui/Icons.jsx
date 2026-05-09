// src/shared/ui/Icons.jsx
// ============================================================
// All icon components used across the application.
// Thin wrappers around lucide-react for consistent icon usage.
// GoogleIcon is kept as inline SVG (brand icon).
// ============================================================

import {
  Home,
  Lock,
  AlertCircle,
  TriangleAlert,
  Eye,
  EyeOff,
  UserCheck,
  UserStar,
  Loader,
  CircleDotDashed,
  Ban,
  Landmark,
  FolderKanban,
  CalendarRange,
  Users,
  QrCode,
  Mail,
  CheckCircle2,
  CirclePlus,
  Clock,
  History,
  Pencil,
  Download,
  Trash,
  FileText,
  Info,
  Circle,
  Trophy,
  LineChart,
  Search,
  X,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Clock3,
  Copy,
  LogOut,
  Code,
  RefreshCcw,
  Activity,
  BarChart2,
  Play,
  CircleCheck,
  PencilLine,
  CircleSlash,
} from "lucide-react";

export function HomeIcon({ size = 16, className = "", ...props }) {
  return <Home size={size} className={className} {...props} />;
}

export function LockIcon({ size = 16, className = "", ...props }) {
  return <Lock size={size} className={className} {...props} />;
}

export function AlertCircleIcon({ size = 16, className = "", ...props }) {
  return <AlertCircle size={size} className={className} {...props} />;
}

export function TriangleAlertIcon({ size = 16, className = "", ...props }) {
  return <TriangleAlert size={size} className={className} {...props} />;
}

export function TriangleAlertLucideIcon({ size = 24, className = "", ...props }) {
  return <TriangleAlert size={size} className={className} {...props} />;
}

export function EyeIcon({ size = 16, className = "", ...props }) {
  return <Eye size={size} className={className} {...props} />;
}

export function EyeOffIcon({ size = 16, className = "", ...props }) {
  return <EyeOff size={size} className={className} {...props} />;
}

export function UserCheckIcon({ size = 16, className = "", ...props }) {
  return <UserCheck size={size} className={className} {...props} />;
}

export function UserStarIcon({ size = 16, className = "", ...props }) {
  return <UserStar size={size} className={className} {...props} />;
}

export function LoaderIcon({ size = 24, className = "", ...props }) {
  return <Loader size={size} className={className} {...props} />;
}

export function CircleDotDashedIcon({ size = 24, className = "", ...props }) {
  return <CircleDotDashed size={size} className={className} {...props} />;
}

export function BanIcon({ size = 16, className = "", ...props }) {
  return <Ban size={size} className={className} {...props} />;
}

export function LandmarkIcon({ size = 16, className = "", ...props }) {
  return <Landmark size={size} className={className} {...props} />;
}

export function FolderKanbanIcon({ size = 16, className = "", ...props }) {
  return <FolderKanban size={size} className={className} {...props} />;
}

export function CalendarRangeIcon({ size = 16, className = "", ...props }) {
  return <CalendarRange size={size} className={className} {...props} />;
}

export function UsersLucideIcon({ size = 24, className = "", ...props }) {
  return <Users size={size} className={className} {...props} />;
}

export function QrCodeIcon({ size = 16, className = "", ...props }) {
  return <QrCode size={size} className={className} {...props} />;
}

export function MailIcon({ size = 16, className = "", ...props }) {
  return <Mail size={size} className={className} {...props} />;
}

export function CheckCircle2Icon({ size = 16, className = "", ...props }) {
  return <CheckCircle2 size={size} className={className} {...props} />;
}

export function CirclePlusIcon({ size = 24, className = "", ...props }) {
  return <CirclePlus size={size} className={className} {...props} />;
}

export function ClockIcon({ size = 16, className = "", ...props }) {
  return <Clock size={size} className={className} {...props} />;
}

export function HistoryIcon({ size = 16, className = "", ...props }) {
  return <History size={size} className={className} {...props} />;
}

export function PencilIcon({ size = 16, className = "", ...props }) {
  return <Pencil size={size} className={className} {...props} />;
}

export function DownloadIcon({ size = 16, className = "", ...props }) {
  return <Download size={size} className={className} {...props} />;
}

export function TrashIcon({ size = 16, className = "", ...props }) {
  return <Trash size={size} className={className} {...props} />;
}

export function FileTextIcon({ size = 16, className = "", ...props }) {
  return <FileText size={size} className={className} {...props} />;
}

export function InfoIcon({ size = 16, className = "", ...props }) {
  return <Info size={size} className={className} {...props} />;
}

export function CircleIcon({ size = 16, className = "", ...props }) {
  return <Circle size={size} className={className} {...props} />;
}

export function TrophyIcon({ size = 16, className = "", ...props }) {
  return <Trophy size={size} className={className} {...props} />;
}

export function ChartIcon({ size = 16, className = "", ...props }) {
  return <LineChart size={size} className={className} {...props} />;
}

export function SearchIcon({ size = 16, className = "", ...props }) {
  return <Search size={size} className={className} {...props} />;
}

export function XIcon({ size = 16, className = "", ...props }) {
  return <X size={size} className={className} {...props} />;
}

export function CheckIcon({ size = 16, className = "", ...props }) {
  return <Check size={size} className={className} {...props} />;
}

export function RefreshIcon({ size = 16, className = "", ...props }) {
  return <RefreshCw size={size} className={className} {...props} />;
}

export function ChevronRightIcon({ size = 16, className = "", ...props }) {
  return <ChevronRight size={size} className={className} {...props} />;
}

export function ChevronDownIcon({ size = 24, className = "", ...props }) {
  return <ChevronDown size={size} className={className} {...props} />;
}

export function ChevronUpIcon({ size = 24, className = "", ...props }) {
  return <ChevronUp size={size} className={className} {...props} />;
}

export function SendIcon({ size = 16, className = "", ...props }) {
  return <Send size={size} className={className} {...props} />;
}

export function Clock3Icon({ size = 16, className = "", ...props }) {
  return <Clock3 size={size} className={className} {...props} />;
}

export function CopyIcon({ size = 16, className = "", ...props }) {
  return <Copy size={size} className={className} {...props} />;
}

export function LogOutIcon({ size = 16, className = "", ...props }) {
  return <LogOut size={size} className={className} {...props} />;
}

export function CodeIcon({ size = 16, className = "", ...props }) {
  return <Code size={size} className={className} {...props} />;
}

export function RefreshCcwIcon({ size = 16, className = "", ...props }) {
  return <RefreshCcw size={size} className={className} {...props} />;
}

export function ActivityIcon({ size = 16, className = "", ...props }) {
  return <Activity size={size} className={className} {...props} />;
}

export function BarChart2Icon({ size = 16, className = "", ...props }) {
  return <BarChart2 size={size} className={className} {...props} />;
}

export function PlayIcon({ size = 16, className = "", ...props }) {
  return <Play size={size} className={className} {...props} />;
}

export function CircleCheckIcon({ size = 16, className = "", ...props }) {
  return <CircleCheck size={size} className={className} {...props} />;
}

export function PencilLineIcon({ size = 16, className = "", ...props }) {
  return <PencilLine size={size} className={className} {...props} />;
}

export function CircleSlashIcon({ size = 16, className = "", ...props }) {
  return <CircleSlash size={size} className={className} {...props} />;
}

// Brand icon — no lucide equivalent, kept as inline SVG.