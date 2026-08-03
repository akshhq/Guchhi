/**
 * products.js
 * Local product catalog. This is intentionally shaped exactly like a REST
 * response so productService.js can be pointed at a real API later without
 * any change to the components that consume it.
 */

function assetUrl(path) {
  return new URL(`../../${path.replace(/^\/+/, '')}`, import.meta.url).href;
}

export const products = [
  {
    id: 'prod_guchhi_morel',
    name: 'Guchhi Mushroom',
    slug: 'morels',
    price: 1500,
    currency: 'INR',
    weight: '50 g',
    category: 'wild-foraged',
    images: [assetUrl('media/morels.jpg')],
    thumbnail: assetUrl('media/morels.jpg'),
    description:
      'Wild-foraged Himalayan morels, hand-graded and sun-dried for four to six days. The diamond of the forest.',
    stock: 42,
    sku: 'GUC-MOREL-050'
  },
  {
    id: 'prod_red_rice',
    name: 'Himalayan Red Rice',
    slug: 'red-rice',
    price: 650,
    currency: 'INR',
    weight: '1 kg',
    category: 'grain',
    images: [assetUrl('media/rice.jpg')],
    thumbnail: assetUrl('media/rice.jpg'),
    description:
      'Unpolished red-pericarp rice grown on rain-fed, snowmelt-irrigated terraces in the Shimla hills.',
    stock: 120,
    sku: 'GUC-RICE-1000'
  },
  {
    id: 'prod_rajma',
    name: 'Premium Rajma',
    slug: 'rajma',
    price: 450,
    currency: 'INR',
    weight: '500 g',
    category: 'legume',
    images: [assetUrl('media/rajma.jpg')],
    thumbnail: assetUrl('media/rajma.jpg'),
    description:
      'Small, thin-skinned Bharmour kidney beans, grown on steep dryland plots at 2,000–2,900 m.',
    stock: 85,
    sku: 'GUC-RAJMA-500'
  }
];
