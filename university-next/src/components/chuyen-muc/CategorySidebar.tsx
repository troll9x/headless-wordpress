import Link from 'next/link';
import { buildCategoryUrl } from '@/constants/duong-dan';
import { stripHtml } from '@/lib/utils/html';
import { categorySidebarStyles as styles } from '@/styles/tlu-template-recipes';
import type { Locale } from '@/types/ngon-ngu';
import type { CategorySidebarData, CategorySidebarItem } from '@/types/wordpress';

interface CategorySidebarProps {
  data: CategorySidebarData;
  locale: Locale;
  currentCategoryId?: number;
}

function getItemLabel(item: CategorySidebarItem): string {
  return stripHtml(item.type === 'term' ? item.name : item.label);
}

function getItemHref(item: CategorySidebarItem, locale: Locale): string {
  return item.type === 'term' ? buildCategoryUrl(item.slug, locale) : item.url;
}

function CategoryItems({
  items,
  locale,
  currentCategoryId,
  nested = false,
}: {
  items: CategorySidebarItem[];
  locale: Locale;
  currentCategoryId?: number;
  nested?: boolean;
}) {
  return (
    <ul className={nested ? styles.submenu : styles.firstLevelList}>
      {items.map((item, index) => {
        const hasChildren = item.children.length > 0;
        const active = item.type === 'term' && item.id === currentCategoryId;

        return (
          <li
            key={item.type === 'term' ? `term-${item.id}` : `custom-${index}-${item.url}`}
            className={`${nested ? styles.submenuItem : styles.firstLevelItem} group/submenu`}
          >
            <Link
              href={getItemHref(item, locale)}
              className={`${nested ? styles.submenuLink : styles.firstLevelLink} ${
                hasChildren && !nested ? styles.submenuToggle : ''
              } ${active ? 'bg-[#e9ecef] font-semibold text-[#007bff]' : ''}`}
            >
              {getItemLabel(item)}
            </Link>
            {hasChildren && (
              <CategoryItems
                items={item.children}
                locale={locale}
                currentCategoryId={currentCategoryId}
                nested
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function CategorySidebar({
  data,
  locale,
  currentCategoryId,
}: CategorySidebarProps) {
  return (
    <nav className={styles.root} aria-label={locale === 'en' ? 'Category navigation' : 'Chuyên mục'}>
      <h2 className={styles.heading}>
        <Link href={buildCategoryUrl(data.root.slug, locale)} className={styles.headingLink}>
          {stripHtml(data.root.name)}
        </Link>
      </h2>
      <CategoryItems
        items={data.items}
        locale={locale}
        currentCategoryId={currentCategoryId}
      />
    </nav>
  );
}
