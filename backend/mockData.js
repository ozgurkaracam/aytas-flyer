const products = [
  {
    id: 1,
    name: "Caykur",
    description: "Rize thee 500g",
    price: 2.99,
    unit: "",
    imageUrl: "",
    badgeText: "500g",
    badgeColor: "#f1c40f",
  },
  {
    id: 2,
    name: "Mahmut",
    description: "Rijst 5kg",
    price: 9.99,
    unit: "",
    imageUrl: "",
    badgeText: "5kg",
    badgeColor: "#e74c3c",
  },
  {
    id: 3,
    name: "Eker",
    description: "Kaas assortiment",
    price: 2.49,
    unit: "",
    imageUrl: "",
    badgeText: "200g",
    badgeColor: "#27ae60",
  },
  {
    id: 4,
    name: "Koç",
    description: "Worst 450g",
    price: 5.49,
    unit: "",
    imageUrl: "",
    badgeText: "450g",
    badgeColor: "#3498db",
  },
];

const campaigns = [
  {
    id: 1,
    title: "Aytas Wereld Supermarkt",
    validText: "Haftanın kampanyaları",
    products: [
      { productId: 1, position: 1 },
      { productId: 2, position: 2 },
      { productId: 3, position: 3 },
      { productId: 4, position: 4 },
    ],
  },
];

function getCampaignById(id) {
  const campaign = campaigns.find((c) => c.id === Number(id));
  if (!campaign) return null;

  const withProducts = {
    ...campaign,
    products: campaign.products
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        ...p,
        product: products.find((pr) => pr.id === p.productId),
      }))
      .filter((p) => p.product),
  };

  return withProducts;
}

module.exports = {
  products,
  campaigns,
  getCampaignById,
};
