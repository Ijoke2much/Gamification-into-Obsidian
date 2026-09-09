import React from 'react';
import {
	resolveItemDisplayIcon,
	type SpriteLookupItem,
} from '../../utils/pixelSprites';

export const PixelIcon: React.FC<{
	item?: SpriteLookupItem | null;
	icon?: string;
	fallback?: string;
	className?: string;
	imgClassName?: string;
	alt?: string;
}> = ({ item, icon, fallback = '📦', className, imgClassName, alt = '' }) => {
	const resolved = resolveItemDisplayIcon(
		item
			? { ...item, icon: icon ?? item.icon }
			: icon
				? { icon }
				: undefined,
		fallback
	);
	if (resolved.kind === 'img') {
		return (
			<img
				className={imgClassName || className}
				src={resolved.src}
				alt={alt}
				draggable={false}
			/>
		);
	}
	return (
		<span className={className} aria-hidden={alt ? undefined : true}>
			{resolved.text}
		</span>
	);
};
