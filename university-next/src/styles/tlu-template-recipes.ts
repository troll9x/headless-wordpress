/**
 * Tailwind recipes converted from the legacy tlu.edu.vn stylesheet.
 *
 * These recipes intentionally live in TypeScript instead of a compatibility
 * stylesheet. Future React templates should import the relevant object and
 * attach each recipe to the semantic element described by its key.
 */

export const blogArchiveStyles = {
  sectionLink:
    'border-b-[3px] border-[#0118d8] font-bold uppercase text-[#0118d8]',
  breadcrumb:
    'relative hidden -mt-[7%] mb-[5%] ml-[20%] font-semibold text-white max-[640px]:-mt-[12%] max-[640px]:ml-0 max-[640px]:text-xs max-[640px]:leading-[30px]',
  breadcrumbSeparator: 'p-[5px] text-white',
  mainColumn: 'max-[580px]:w-full max-[580px]:max-w-full max-[580px]:basis-full',
  sidebarColumn: 'max-[580px]:hidden',
  row: 'mx-0',
  column: 'max-[580px]:w-full max-[580px]:max-w-full max-[580px]:basis-full max-[580px]:px-0',
  postItem:
    'pb-0 max-[580px]:border-b max-[580px]:border-[#eee] max-[580px]:pb-5 last:max-[580px]:mb-0 last:max-[580px]:border-b-0 last:max-[580px]:pb-0',
  postInner: 'border-0 py-5 max-[580px]:px-5 max-[580px]:py-0',
  primaryBox: 'rounded-lg max-[580px]:block',
  primaryImage:
    'relative aspect-[10/7] overflow-hidden max-[580px]:mb-2.5 max-[580px]:aspect-[5/3] max-[580px]:w-full max-[580px]:rounded-lg',
  primaryText: 'pt-2.5 max-[580px]:w-auto max-[580px]:p-0 max-[580px]:text-left',
  primaryTitle:
    'mb-2.5 line-clamp-2 text-base font-semibold text-[#0118d8] max-[580px]:mb-[5px] max-[580px]:line-clamp-none max-[580px]:text-lg max-[580px]:leading-[1.3]',
  primaryExcerpt:
    'hidden text-black max-[580px]:mb-[5px] max-[580px]:block max-[580px]:text-[13px] max-[580px]:leading-normal',
  primaryDate: 'hidden max-[580px]:mt-[5px] max-[580px]:block max-[580px]:text-xs max-[580px]:text-[#777]',
  secondaryBox: 'w-full max-[580px]:flex max-[580px]:items-start',
  secondaryImage:
    'relative aspect-[5/4] max-[580px]:mr-[15px] max-[580px]:h-[90px] max-[580px]:w-[90px] max-[580px]:shrink-0 max-[580px]:overflow-hidden max-[580px]:rounded',
  secondaryImageElement:
    'h-full w-full object-cover max-[580px]:absolute max-[580px]:inset-0',
  secondaryText: 'pl-[15px] max-[580px]:w-auto max-[580px]:grow max-[580px]:p-0',
  secondaryTitle:
    'mb-2.5 line-clamp-2 text-base font-normal text-[#5065a1] max-[580px]:mb-[5px] max-[580px]:leading-[1.3]',
  secondaryExcerpt:
    'line-clamp-2 text-[15px] leading-5 text-black max-[580px]:hidden',
  secondaryDate: 'hidden max-[580px]:mt-[5px] max-[580px]:block max-[580px]:text-[11px] max-[580px]:text-[#777]',
  fullImage: 'h-full w-full object-cover',
} as const;

export const categoryBannerStyles = {
  root: 'relative w-full p-0',
  image: 'relative bottom-0 right-0 z-0 h-full w-full max-[640px]:aspect-video max-[640px]:object-cover',
  title:
    'relative mx-[20%] -mt-[10%] mb-[5%] hidden max-w-[1000px] -skew-x-[20deg] bg-[rgba(0,12,144,0.75)] px-12 py-8 text-center text-[40px] font-semibold text-white max-[640px]:mx-0 max-[640px]:-mt-[30%] max-[640px]:px-4 max-[640px]:py-6 max-[640px]:text-lg',
  titleInner: 'skew-x-[20deg]',
} as const;

export const tabbedContentStyles = {
  root: 'flex gap-[30px] max-md:flex-col',
  navigation:
    'sticky top-[150px] min-w-[220px] max-h-[calc(100vh-120px)] self-start overflow-y-auto rounded-[10px] bg-[#f9f9f9] p-5 max-md:static max-md:max-h-none max-md:w-full max-md:bg-transparent max-md:p-0',
  tabLink:
    'block rounded-[5px] px-[15px] py-2.5 text-[#333] no-underline transition-colors duration-200 hover:bg-[#0118d8] hover:text-white',
  activeTabLink: 'bg-[#0118d8] text-white',
  panels: 'min-w-0 flex-1 max-md:w-full',
} as const;

export const categorySidebarStyles = {
  root:
    'mx-auto max-w-full list-none overflow-hidden rounded-lg bg-white p-0 shadow-[0_2px_10px_rgba(0,0,0,0.1)] max-md:m-2.5',
  list: 'm-0 w-full list-none p-0',
  heading: 'm-0 bg-[#007bff] p-0',
  headingLink:
    'block px-5 py-[15px] text-base font-semibold uppercase tracking-[0.5px] text-white no-underline transition-all duration-300 hover:bg-[#0056b3]',
  firstLevelList: 'list-none bg-[#f8f9fa] p-0',
  firstLevelItem:
    'group/submenu relative border-b border-[#dee2e6] last:border-b-0',
  firstLevelLink:
    'relative block px-5 py-3 font-medium text-[#333] no-underline transition-all duration-300 hover:bg-[#e9ecef] hover:pl-[25px] hover:text-[#007bff]',
  submenuToggle:
    "after:absolute after:right-[15px] after:top-1/2 after:-translate-y-1/2 after:text-[10px] after:text-[#666] after:content-['▶'] after:transition-transform after:duration-300 group-hover/submenu:after:rotate-90 max-md:after:content-['▼'] max-md:group-hover/submenu:after:rotate-180",
  submenu:
    'static h-0 max-h-0 list-none overflow-hidden border-0 bg-white pl-5 shadow-none transition-all duration-300 group-hover/submenu:h-auto group-hover/submenu:max-h-[500px] max-md:border-l-[3px] max-md:border-[#007bff] max-md:bg-[#f1f3f4] max-md:group-hover/submenu:max-h-[200px]',
  submenuItem: 'border-b border-[#f1f3f4] last:border-b-0',
  submenuLink:
    'block bg-transparent px-5 py-2.5 text-sm font-normal text-[#555] transition-all duration-300 hover:bg-[#f8f9fa] hover:pl-[25px] hover:text-[#007bff]',
} as const;

export const quoteSectionStyles = {
  root:
    "relative rounded-tl-[500px] after:absolute after:right-[50px] after:top-[30px] after:z-[1] after:scale-y-[-1] after:font-sans after:text-[150px] after:leading-none after:text-white after:content-['❞'] max-md:after:right-[25px] max-md:after:top-[15px] max-md:after:text-[50px]",
  media: 'w-1/4',
  heading: 'leading-[1.6] max-md:text-[15px]',
  quote: 'text-[25px] max-md:text-xs',
} as const;

export const documentArchiveStyles = {
  viewToggle: 'my-5 text-right',
  viewButton:
    'ml-2.5 inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#ccc] bg-[#f0f0f0] text-[#333] no-underline transition-colors duration-300 hover:bg-[#e0e0e0]',
  activeViewButton: 'border-[#0073aa] bg-[#0073aa] text-white hover:bg-[#0073aa]',
  gridItem: 'mb-5',
  listItem: 'mb-5 flex w-full flex-wrap items-start max-md:block',
  listThumbnail:
    'mr-[15px] max-w-[100px] flex-none max-md:mb-2.5 max-md:mr-0 max-md:block max-md:max-w-full',
  listTitle: 'mt-0 min-w-0 flex-1 break-words max-md:mt-2.5',
  listColumn: 'px-[15px]',
  loadMore: 'my-5 text-center',
  loadMoreButton:
    'inline-block rounded-[5px] bg-[#0073aa] px-5 py-2.5 text-white no-underline hover:bg-[#005d87]',
  tableWrapper: 'max-md:overflow-x-auto',
  table:
    'mt-5 w-full border-collapse text-sm max-md:min-w-[600px] max-md:text-[13px] max-[480px]:text-xs',
  tableHead:
    'border border-[#ddd] bg-[#f3f3f3] px-3 py-2.5 text-left align-top font-bold',
  tableCell: 'border border-[#ddd] px-3 py-2.5 align-top',
  evenRow: 'bg-[#fafafa]',
} as const;

export const admissionsFeatureStyles = {
  root:
    "group relative mb-[5%] overflow-hidden after:absolute after:inset-x-0 after:bottom-0 after:z-[1] after:h-[150px] after:rounded-[20px] after:bg-gradient-to-t after:from-[#0118d8] after:to-transparent after:content-[''] min-[1200px]:before:absolute min-[1200px]:before:inset-x-0 min-[1200px]:before:top-[60%] min-[1200px]:before:z-[1] min-[1200px]:before:h-full min-[1200px]:before:rounded-[20px] min-[1200px]:before:bg-transparent min-[1200px]:before:content-[''] min-[1200px]:before:transition-all min-[1200px]:before:duration-[600ms] min-[1200px]:hover:before:top-0 min-[1200px]:hover:before:bg-[#0118d8]/55 min-[1200px]:hover:after:opacity-0",
  image: 'block h-full w-full rounded-[20px] object-cover',
  description:
    'absolute left-0 z-[2] h-full w-full p-[60px_30px_30px] transition-[bottom] duration-500 [bottom:calc(10px-100%)] group-hover:bottom-0 max-md:p-[15px] max-md:[bottom:calc(80px-100%)]',
  title: 'pb-[50px] text-[#f7ca44] min-[1200px]:group-hover:mb-[30px] max-md:mb-2.5',
  titleLink:
    'block min-h-[60px] text-center text-xl uppercase leading-normal text-[#f7ca44] max-md:text-sm',
  excerpt: 'text-[#f7ca44]',
} as const;

export const singlePostTemplateStyles = {
  title:
    'my-[10px] line-clamp-none text-center text-3xl font-bold text-[#0118d8] sm:text-4xl',
  taxonomyLabel: 'mr-[5px] rounded bg-[#0118d8] px-2.5 py-1 text-white',
  taxonomyLink:
    'mb-2.5 rounded bg-[#dedede] px-2.5 py-1 leading-8 text-[#464646] transition-colors hover:bg-[#007bff] hover:text-white',
  relatedSection: 'mt-[15px]',
  relatedHeading: 'text-[19px] font-semibold text-[#0118d8]',
  relatedList: 'mb-0 inline-block w-full max-md:flex max-md:flex-col max-md:items-start',
  relatedItem: 'float-left w-1/4 px-1 text-gray-500 max-md:w-full max-md:p-0',
  relatedImage: 'h-[120px] w-full rounded object-cover object-center max-md:h-auto',
  relatedTitle:
    'h-16 overflow-hidden pt-[7px] text-[15px] leading-[19px] text-black hover:text-[#0118d8]',
  meta: 'flex border-0 bg-white max-md:w-full max-md:flex-col max-md:flex-nowrap max-md:items-center',
  previousNextLink: 'font-semibold text-black hover:text-[#0118d8]',
  googleNews:
    'block h-[30px] rounded-[10px] border px-2.5 pr-[90px] text-[13px] leading-[30px] text-[#6f6f70] transition hover:-translate-y-0.5 hover:shadow-[0_6px_8px_rgba(0,0,0,0.2)] max-[640px]:mt-2.5 max-[640px]:text-[10px]',
} as const;

export const recruitmentDetailStyles = {
  benefitLabel: 'font-semibold text-black',
  benefits:
    'mb-5 grid w-full grid-cols-3 items-stretch gap-5 border-b border-[#e2e2e2] pb-5 text-black max-md:flex max-md:h-[150px] max-md:flex-col max-md:flex-wrap max-md:content-between',
  infoCard: 'float-none shadow-[0_28px_40px_0_rgba(57,57,57,0.21)]',
  infoHeading:
    'flex h-[53px] items-center justify-between rounded-t-[5px] bg-[#0469b0] px-5 py-2.5 text-white',
  infoList: 'ml-[10%] list-none pb-[10%]',
  infoItem:
    "my-2.5 border-b border-[#ddd] font-semibold leading-[1.5] text-[#3d93d0] transition-all duration-[350ms] before:mr-[5px] before:text-[#3d93d0] before:content-['›'] hover:ml-[5px]",
  applyForm: 'relative',
  submitButton:
    'ml-[15%] inline-flex items-center rounded-[30px] bg-gradient-to-r from-[#218738] to-[#5fc53f] px-10',
  formTitle:
    'flex h-[53px] items-center justify-between rounded-t-[5px] bg-[#528934] px-5 pt-2.5 text-center font-semibold text-white',
  formContent: 'p-5',
  applyButton:
    'border-0 bg-gradient-to-r from-[#218738] to-[#5fc53f] p-2.5 text-white hover:from-[#5fc53f] hover:to-[#218738]',
  sidebar: 'pb-5 text-center',
  profileButton: 'border border-[#136aa0] text-[#136aa0]',
  supportText: 'text-[13px] font-semibold text-black',
} as const;

export const recruitmentPopupStyles = {
  overlay: 'fixed inset-0 z-[999] hidden h-full w-full bg-black/50',
  overlayOpen: 'block',
  dialog:
    'fixed left-1/2 top-1/2 z-[1000] hidden h-[550px] w-auto max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[5px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] max-md:w-4/5',
  dialogOpen: 'block',
  closeButton:
    "absolute right-2.5 top-[5px] h-[30px] w-[30px] cursor-pointer rounded-full border border-white text-xl before:absolute before:left-1/2 before:top-1/2 before:h-0.5 before:w-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:-rotate-45 before:bg-white before:content-[''] before:transition-transform after:absolute after:left-1/2 after:top-1/2 after:h-0.5 after:w-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-white after:content-[''] after:transition-transform hover:before:rotate-180 hover:after:rotate-180",
} as const;

export const recruitmentListStyles = {
  root: 'w-full border-b border-[#414041] bg-[#f9f9f9] p-5 max-md:p-2.5',
  item:
    'mb-0 flex w-full items-center border-b border-[#e2e2e2] p-5 max-md:mb-5 max-md:p-0',
  content: 'flex w-full flex-row items-center max-md:flex-col max-md:items-start max-md:text-left',
  header: 'flex w-4/5 flex-row items-center max-md:w-full max-md:flex-col',
  logo:
    'h-[150px] w-[150px] rounded-[15px] border border-[#e2e2e2] bg-white object-contain max-md:hidden',
  info: 'w-full pl-5 max-[991px]:w-[82%] max-md:w-full max-md:pl-0',
  titleLink: 'mb-[5px] text-xl font-bold capitalize text-[#009051]',
  metadata: 'mb-2',
  footer:
    'flex w-1/5 flex-col items-end text-right max-md:mb-[10%] max-md:w-full max-md:items-start max-md:text-left',
  date: 'mb-[10%] max-md:w-full',
  detailLink:
    'rounded-[10px] border border-[#009051] bg-transparent p-2.5 text-lg font-semibold text-[#009051] no-underline hover:bg-[#009051] hover:text-white max-[991px]:px-[8.6px] max-[991px]:py-[5px] max-[991px]:text-[15px] max-md:w-full max-md:text-center',
} as const;

export const organizationStyles = {
  root: 'mx-auto max-w-[1200px] p-5 font-[Arial,sans-serif]',
  leaders: 'mb-10',
  leaderCard:
    'relative mx-auto w-1/2 cursor-pointer overflow-hidden rounded-[15px] border border-[#e0e0e0] bg-white p-[30px] text-center text-black transition duration-300 hover:-translate-y-[5px] hover:shadow-[0_15px_35px_rgba(44,85,48,0.3)] max-md:w-full',
  leaderInfo: 'items-center gap-[30px] max-md:flex-col max-md:text-center',
  leaderAvatar: 'shrink-0',
  leaderAvatarMedia:
    'mx-auto h-[120px] w-[120px] rounded-full border-4 border-white/30 object-cover',
  leaderAvatarFallback:
    'mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-5xl font-bold text-white',
  leaderPosition: 'mb-[5px] text-base font-normal text-[#555]',
  leaderName: 'mb-[15px] text-xl font-bold text-black',
  leaderDescription: 'mb-[15px] text-sm leading-[1.6] text-white/90',
  viewMore: 'inline-block text-xs font-bold tracking-[1px] text-[#a8d5aa]',
  members:
    'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5 max-md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
  memberCard:
    'cursor-pointer rounded-[10px] border border-[#e0e0e0] bg-white p-5 text-center transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)]',
  memberAvatarMedia: 'mx-auto mb-[15px] block h-20 w-20 rounded-full object-cover',
  memberAvatarFallback:
    'mx-auto mb-[15px] flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f0f0] text-2xl font-bold text-[#666]',
  memberPosition: 'mb-[5px] text-sm font-medium text-[#2c5530]',
  memberName: 'text-xl font-bold text-[#333]',
  memberHeading: 'text-base font-normal',
} as const;

export const organizationModalStyles = {
  overlay:
    'fixed inset-0 z-[9999] hidden h-full w-full items-center justify-center bg-black/80',
  overlayOpen: 'flex',
  dialog:
    'relative max-h-[50vh] w-[90%] max-w-[800px] overflow-y-auto rounded-[15px] bg-white max-md:m-5 max-md:w-[95%]',
  close:
    'sticky top-2.5 z-[1] ml-[92%] cursor-pointer text-[28px] font-bold text-[#999] hover:text-[#333]',
  body: 'px-[30px] pb-[30px] pt-10 text-center max-md:px-5 max-md:pb-5 max-md:pt-[30px]',
  avatarMedia: 'mx-auto mb-5 block h-[120px] w-[120px] rounded-full object-cover',
  avatarFallback:
    'mx-auto mb-5 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#f0f0f0] text-5xl font-bold text-[#666]',
  position: 'mb-[5px] text-base font-medium text-[#2c5530]',
  name: 'mb-5 text-2xl font-bold text-[#333]',
  description: 'text-left text-base leading-[1.6] text-[#666]',
} as const;

export const historyPageStyles = {
  equalHeightColumn: 'h-full',
  firstImage: 'h-[550px] max-[480px]:h-auto',
  secondImage: 'h-[610px] max-[480px]:h-auto',
} as const;

export const featuredSliderStyles = {
  root: 'my-[30px]',
  desktop: 'mb-[30px] grid grid-cols-[2fr_1fr] gap-[30px] max-md:hidden',
  featuredCard:
    'overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:-translate-y-[5px]',
  featuredImage:
    'relative block aspect-[5/4] w-full shrink-0 overflow-hidden bg-slate-100',
  imageElement: 'absolute inset-0 h-full w-full object-cover',
  featuredContent: 'p-6',
  featuredTitle: 'mb-3 text-xl font-bold leading-[1.3]',
  featuredTitleLink: 'text-[#0118d8] no-underline transition-colors duration-300 hover:text-[#007cba]',
  featuredExcerpt: 'mb-3 leading-[1.6] text-[#666]',
  featuredMeta: 'text-[13px] text-[#888]',
  slides: 'relative overflow-hidden',
  slidesContainer:
    'h-full overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
  slidesWrapper: 'relative h-[99.5%] shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
  slide:
    'absolute inset-0 flex h-full w-full flex-col gap-[15px] opacity-0 transition-opacity duration-500',
  activeSlide: 'pointer-events-auto z-[2] visible opacity-100',
  slidePost: 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#f8f9fa]',
  slideImage:
    'relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100',
  slideContent: 'flex min-w-0 flex-1 flex-col justify-center p-2.5',
  slideTitle: 'm-0 text-sm font-semibold leading-[1.4]',
  slideTitleLink:
    'line-clamp-3 text-[#0118d8] no-underline transition-colors duration-300 hover:text-[#007cba]',
  slideExcerpt: 'text-xs',
  slideMeta: 'text-xs',
  navigation:
    'pointer-events-none absolute top-1/2 z-10 flex w-full -translate-y-1/2 justify-between px-2',
  navigationButton:
    'pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border-0 bg-[#007cba] text-xs text-white opacity-0 shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition duration-300 hover:scale-110 hover:bg-[#005f8c] focus:opacity-100 group-hover/slider:opacity-100',
  dots: 'absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-[5px]',
  dot: 'h-1.5 w-1.5 cursor-pointer rounded-full bg-white/60 transition duration-300',
  activeDot: 'scale-120 bg-[#007cba]',
  mobile: 'hidden box-border px-[15px] max-md:block',
  mobileMainCard:
    'mb-5 overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
  mobileMainImage:
    'relative block aspect-[5/3] w-full shrink-0 overflow-hidden bg-slate-100',
  mobileMainContent: 'p-[15px]',
  mobileMainTitle: 'mb-2.5 text-lg font-bold leading-[1.3]',
  mobileMainTitleLink: 'text-[#0118d8] no-underline',
  mobileMainExcerpt: 'mb-2.5 text-sm leading-normal text-[#666]',
  mobileMainMeta: 'text-xs text-[#888]',
  mobileSlides: 'relative overflow-hidden',
  mobileSlidesContainer: 'h-[25vh] overflow-hidden rounded-xl bg-white',
  mobileSlidesWrapper: 'relative h-full',
  mobileSlide:
    'absolute inset-0 flex h-[23vh] w-full flex-col gap-[15px] opacity-0 transition-opacity duration-500',
  mobileSlidePost: 'flex flex-1 gap-2.5 overflow-hidden rounded-lg bg-[#f8f9fa]',
  mobileSlideImage:
    'relative block h-[90px] w-[90px] shrink-0 overflow-hidden bg-slate-100',
  mobileSlideContent: 'flex grow flex-col justify-center',
  mobileSlideTitle: 'm-0 text-sm font-semibold leading-[1.4]',
  mobileSlideTitleLink: 'line-clamp-2 text-[#0118d8] no-underline',
  mobileExcerpt: 'text-[10px]',
  mobileNavigation:
    'pointer-events-none absolute top-1/2 z-10 flex w-full -translate-y-1/2 justify-between px-2.5',
  mobileNavigationButton:
    'pointer-events-auto flex h-[35px] w-[35px] items-center justify-center rounded-full border-0 bg-black/50 text-base text-white hover:bg-black/70',
  mobileDots: 'absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5',
  mobileDot: 'h-1.5 w-1.5 cursor-pointer rounded-full bg-white/50 transition duration-300',
  activeMobileDot: 'bg-blue-600',
} as const;

export const miscTemplateStyles = {
  homepageTitleWrapper: 'text-center',
  homepageTitle: 'mt-[5px] mb-5 inline-block border-b-[3px] border-[#0118d8]',
  admissionsPanel:
    'bg-white shadow-[0_0_3px_2px_rgba(0,0,0,0.3)] max-[480px]:shadow-none',
  markerList: 'm-0 list-none p-0',
  markerItem: 'relative pl-8',
  markerLink: 'font-semibold text-[#0118d8]',
  priorityIcon: 'ml-[5px] inline-block h-auto w-7 align-middle',
  borderedEditorTable: 'w-full border-collapse border border-black',
  borderedEditorCell: 'border border-black p-1.5',
  quizContactField: 'h-auto',
} as const;
