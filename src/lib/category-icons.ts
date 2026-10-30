import { Airplane, Armchair, Baby, Bank, Barbell, Basket, Bed, BeerBottle, Bicycle, Books, Briefcase, Buildings, Bus, Cake, Calendar, Car, Cigarette, ChartLineUp, Coffee, Coins, CreditCard, DeviceMobile, Drop, FilmSlate, FirstAid, Fire, Flower, ForkKnife, GameController, GasPump, Gift, GraduationCap, Hamburger, Hammer, HandCoins, Handbag, Heart, Heartbeat, House, Laptop, Lightbulb, Money, Motorcycle, Mountains, MusicNotes, Newspaper, Package, PawPrint, Percent, Phone, PiggyBank, Pill, Pizza, Plant, Popcorn, Receipt, Repeat, Scissors, ShieldCheck, ShoppingBag, ShoppingCart, Sneaker, Sparkle, Star, Stethoscope, Storefront, Suitcase, Sun, Taxi, Television, Ticket, Tooth, Toolbox, Train, TShirt, Umbrella, Wallet, WifiHigh, Wine, Wrench, Tag, type Icon } from "@phosphor-icons/react";

/**
 * The icons a category can wear. The database stores only the key (the object key below), so an icon costs a few bytes per category
 * and nothing is fetched: the pictures ship with the app. A key the app does not know falls back to the tag. Add an icon by adding a line.
 */
export const CATEGORY_ICONS: Record<string, { icon: Icon; label: string }> = {
  ForkKnife: { icon: ForkKnife, label: "Food" }, Coffee: { icon: Coffee, label: "Coffee" }, Hamburger: { icon: Hamburger, label: "Fast food" }, Pizza: { icon: Pizza, label: "Pizza" },
  BeerBottle: { icon: BeerBottle, label: "Drinks" }, Wine: { icon: Wine, label: "Wine" }, Cake: { icon: Cake, label: "Treats" }, Basket: { icon: Basket, label: "Groceries" },
  ShoppingCart: { icon: ShoppingCart, label: "Shopping cart" }, ShoppingBag: { icon: ShoppingBag, label: "Shopping" }, Storefront: { icon: Storefront, label: "Store" }, Handbag: { icon: Handbag, label: "Fashion" },
  TShirt: { icon: TShirt, label: "Clothes" }, Sneaker: { icon: Sneaker, label: "Shoes" }, Package: { icon: Package, label: "Delivery" }, Gift: { icon: Gift, label: "Gifts" },
  Car: { icon: Car, label: "Car" }, Taxi: { icon: Taxi, label: "Taxi" }, Bus: { icon: Bus, label: "Bus" }, Train: { icon: Train, label: "Train" }, Airplane: { icon: Airplane, label: "Flights" },
  GasPump: { icon: GasPump, label: "Fuel" }, Bicycle: { icon: Bicycle, label: "Cycle" }, Motorcycle: { icon: Motorcycle, label: "Bike" }, Suitcase: { icon: Suitcase, label: "Travel" }, Mountains: { icon: Mountains, label: "Trips" },
  House: { icon: House, label: "Home" }, Bed: { icon: Bed, label: "Stay" }, Armchair: { icon: Armchair, label: "Furniture" }, Lightbulb: { icon: Lightbulb, label: "Electricity" }, Drop: { icon: Drop, label: "Water" },
  Fire: { icon: Fire, label: "Gas" }, WifiHigh: { icon: WifiHigh, label: "Internet" }, Phone: { icon: Phone, label: "Phone" }, DeviceMobile: { icon: DeviceMobile, label: "Mobile" }, Buildings: { icon: Buildings, label: "Rent" },
  Television: { icon: Television, label: "TV" }, GameController: { icon: GameController, label: "Games" }, FilmSlate: { icon: FilmSlate, label: "Movies" }, Popcorn: { icon: Popcorn, label: "Cinema" },
  MusicNotes: { icon: MusicNotes, label: "Music" }, Ticket: { icon: Ticket, label: "Events" }, Newspaper: { icon: Newspaper, label: "News" }, Sun: { icon: Sun, label: "Holiday" },
  Heartbeat: { icon: Heartbeat, label: "Health" }, FirstAid: { icon: FirstAid, label: "First aid" }, Pill: { icon: Pill, label: "Medicine" }, Stethoscope: { icon: Stethoscope, label: "Doctor" }, Tooth: { icon: Tooth, label: "Dental" },
  Barbell: { icon: Barbell, label: "Gym" }, Scissors: { icon: Scissors, label: "Salon" }, Cigarette: { icon: Cigarette, label: "Smoking" },
  GraduationCap: { icon: GraduationCap, label: "Education" }, Books: { icon: Books, label: "Books" }, Briefcase: { icon: Briefcase, label: "Work" }, Laptop: { icon: Laptop, label: "Tech" },
  Wrench: { icon: Wrench, label: "Repairs" }, Hammer: { icon: Hammer, label: "Maintenance" }, Toolbox: { icon: Toolbox, label: "Tools" },
  Baby: { icon: Baby, label: "Kids" }, PawPrint: { icon: PawPrint, label: "Pets" }, Plant: { icon: Plant, label: "Plants" }, Flower: { icon: Flower, label: "Flowers" }, Heart: { icon: Heart, label: "Charity" },
  Receipt: { icon: Receipt, label: "Bills" }, Bank: { icon: Bank, label: "Bank" }, CreditCard: { icon: CreditCard, label: "Card" }, Wallet: { icon: Wallet, label: "Wallet" }, Money: { icon: Money, label: "Cash" },
  PiggyBank: { icon: PiggyBank, label: "Savings" }, ChartLineUp: { icon: ChartLineUp, label: "Investments" }, Coins: { icon: Coins, label: "Coins" }, HandCoins: { icon: HandCoins, label: "Loans" },
  Percent: { icon: Percent, label: "Interest" }, ShieldCheck: { icon: ShieldCheck, label: "Insurance" }, Umbrella: { icon: Umbrella, label: "Cover" }, Repeat: { icon: Repeat, label: "Subscriptions" },
  Calendar: { icon: Calendar, label: "Planned" }, Sparkle: { icon: Sparkle, label: "Other" }, Star: { icon: Star, label: "Favourite" },
};

/** The icon for a stored key; the plain tag when none is set or the key is unknown. */
export const categoryIcon = (key?: string): Icon => (key && CATEGORY_ICONS[key]?.icon) || Tag;
