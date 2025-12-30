<script lang="ts">
	import {
		// Common icons
		Check, X, Plus, Minus, Search, Filter, Settings, MoreHorizontal, MoreVertical,
		// Navigation
		ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
		// UI
		Eye, EyeOff, Edit, Trash2, Copy, Download, Upload, Share, ExternalLink,
		// Communication
		MessageSquare, Mail, Phone, Send, Bell, BellOff,
		// User & People
		User, Users, UserPlus, UserMinus, Crown, Shield,
		// Time & Calendar
		Clock, Calendar, CalendarDays, Timer, Watch,
		// Media
		Play, Pause, CircleStop, Volume2, VolumeX, Music, Video,
		// Files & Documents
		File, FileText, Folder, FolderOpen, Image, Download as DownloadIcon,
		// Status & Feedback
		AlertCircle, AlertTriangle, Info, CheckCircle, XCircle, HelpCircle,
		// Theme & Display
		Sun, Moon, Monitor, Contrast, Palette,
		// Actions
		RefreshCw, RotateCcw, Save, Heart, Star, Bookmark, Flag,
		// Social & Engagement
		ThumbsUp, ThumbsDown, Share2, MessageCircle, Zap,
		// Location & Maps
		MapPin, Navigation, Compass, Globe,
		// Shopping & Commerce
		ShoppingCart, CreditCard, Package, Truck,
		// Data & Analytics
		BarChart, PieChart, TrendingUp, TrendingDown, Activity,
		// Technical
		Code, Terminal, Database, Server, Wifi, WifiOff,
		// Utility
		Lock, Unlock, Key, Tag, Link, Unlink, QrCode,
		// Gaming & Activities
		Target, Trophy, Award, Gamepad2, Dice1,
		// Organization
		Grid, List, Columns, Rows, Table
	} from 'lucide-svelte';

	// Map icon names to components
	const iconMap = {
		// Common
		check: Check,
		x: X,
		close: X,
		plus: Plus,
		add: Plus,
		minus: Minus,
		remove: Minus,
		search: Search,
		filter: Filter,
		settings: Settings,
		'more-horizontal': MoreHorizontal,
		'more-vertical': MoreVertical,
		menu: MoreHorizontal,

		// Navigation
		'arrow-left': ArrowLeft,
		'arrow-right': ArrowRight,
		'arrow-up': ArrowUp,
		'arrow-down': ArrowDown,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,
		'chevron-up': ChevronUp,
		'chevron-down': ChevronDown,

		// UI
		eye: Eye,
		'eye-off': EyeOff,
		edit: Edit,
		trash: Trash2,
		delete: Trash2,
		copy: Copy,
		download: Download,
		upload: Upload,
		share: Share,
		'external-link': ExternalLink,

		// Communication
		message: MessageSquare,
		chat: MessageSquare,
		mail: Mail,
		email: Mail,
		phone: Phone,
		send: Send,
		bell: Bell,
		notification: Bell,
		'bell-off': BellOff,

		// User & People
		user: User,
		profile: User,
		users: Users,
		people: Users,
		'user-plus': UserPlus,
		'user-minus': UserMinus,
		crown: Crown,
		admin: Crown,
		shield: Shield,
		security: Shield,

		// Time & Calendar
		clock: Clock,
		time: Clock,
		calendar: Calendar,
		'calendar-days': CalendarDays,
		timer: Timer,
		stopwatch: Watch,

		// Media
		play: Play,
		pause: Pause,
		stop: CircleStop,
		volume: Volume2,
		sound: Volume2,
		mute: VolumeX,
		'volume-off': VolumeX,
		music: Music,
		video: Video,

		// Files & Documents
		file: File,
		document: File,
		'file-text': FileText,
		text: FileText,
		folder: Folder,
		'folder-open': FolderOpen,
		image: Image,
		photo: Image,

		// Status & Feedback
		'alert-circle': AlertCircle,
		error: AlertCircle,
		'alert-triangle': AlertTriangle,
		warning: AlertTriangle,
		info: Info,
		information: Info,
		'check-circle': CheckCircle,
		success: CheckCircle,
		'x-circle': XCircle,
		failed: XCircle,
		'help-circle': HelpCircle,
		help: HelpCircle,

		// Theme & Display
		sun: Sun,
		light: Sun,
		moon: Moon,
		dark: Moon,
		monitor: Monitor,
		auto: Monitor,
		contrast: Contrast,
		'high-contrast': Contrast,
		palette: Palette,
		theme: Palette,

		// Actions
		refresh: RefreshCw,
		reload: RefreshCw,
		'rotate-ccw': RotateCcw,
		reset: RotateCcw,
		save: Save,
		heart: Heart,
		like: Heart,
		star: Star,
		favorite: Star,
		bookmark: Bookmark,
		flag: Flag,

		// Social & Engagement
		'thumbs-up': ThumbsUp,
		upvote: ThumbsUp,
		'thumbs-down': ThumbsDown,
		downvote: ThumbsDown,
		'share-2': Share2,
		'message-circle': MessageCircle,
		comment: MessageCircle,
		zap: Zap,
		lightning: Zap,

		// Location & Maps
		'map-pin': MapPin,
		location: MapPin,
		pin: MapPin,
		navigation: Navigation,
		compass: Compass,
		globe: Globe,
		world: Globe,

		// Shopping & Commerce
		'shopping-cart': ShoppingCart,
		cart: ShoppingCart,
		'credit-card': CreditCard,
		payment: CreditCard,
		package: Package,
		box: Package,
		truck: Truck,
		shipping: Truck,

		// Data & Analytics
		'bar-chart': BarChart,
		chart: BarChart,
		'pie-chart': PieChart,
		'trending-up': TrendingUp,
		up: TrendingUp,
		'trending-down': TrendingDown,
		down: TrendingDown,
		activity: Activity,
		analytics: Activity,

		// Technical
		code: Code,
		terminal: Terminal,
		console: Terminal,
		database: Database,
		server: Server,
		wifi: Wifi,
		'wifi-off': WifiOff,
		offline: WifiOff,

		// Utility
		lock: Lock,
		locked: Lock,
		unlock: Unlock,
		unlocked: Unlock,
		key: Key,
		password: Key,
		tag: Tag,
		label: Tag,
		link: Link,
		unlink: Unlink,
		'qr-code': QrCode,
		qr: QrCode,

		// Gaming & Activities
		target: Target,
		goal: Target,
		trophy: Trophy,
		award: Award,
		prize: Award,
		gamepad: Gamepad2,
		game: Gamepad2,
		dice: Dice1,

		// Organization
		grid: Grid,
		list: List,
		columns: Columns,
		rows: Rows,
		table: Table
	} as const;

	export type IconName = keyof typeof iconMap;

	interface IconProps {
		name: IconName;
		size?: number | string;
		color?: string;
		class?: string;
		title?: string;
		'aria-label'?: string;
		'aria-hidden'?: boolean;
	}

	let {
		name,
		size = 16,
		color,
		class: className = '',
		title,
		'aria-label': ariaLabel,
		'aria-hidden': ariaHidden,
		...restProps
	}: IconProps = $props();

	// Get the icon component
	$: IconComponent = iconMap[name];

	// Prepare props for the icon component
	$: iconProps = {
		size,
		color,
		class: className,
		title: title || ariaLabel,
		'aria-label': ariaLabel,
		'aria-hidden': ariaHidden || (!title && !ariaLabel),
		...restProps
	};

	// Validate icon exists
	$: if (!IconComponent) {
		console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(iconMap).join(', '));
	}
</script>

{#if IconComponent}
	<svelte:component this={IconComponent} {...iconProps} />
{:else}
	<!-- Fallback for missing icons -->
	<span
		class="icon-fallback {className}"
		title={title || `Missing icon: ${name}`}
		aria-label={ariaLabel || `Missing icon: ${name}`}
		style="width: {typeof size === 'number' ? size + 'px' : size}; height: {typeof size === 'number' ? size + 'px' : size};"
	>
		?
	</span>
{/if}

<style>
	.icon-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 0.75em;
		color: var(--color-text-tertiary);
		font-weight: var(--font-weight-bold);
	}
</style>