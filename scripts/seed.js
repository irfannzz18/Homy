'use strict';
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
const photos = {
  Breakfast: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1100&q=85',
  'Rice Meals': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1100&q=85',
  Meals: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1100&q=85',
  Sides: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1100&q=85',
  Snacks: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1100&q=85',
  Sweets: 'https://images.unsplash.com/photo-1605197582451-2b9a7d4eacb8?auto=format&fit=crop&w=1100&q=85'
};
const rows = [
['Idli Breakfast Kit','Soft steamed idlis with coconut chutney and sambar.','Breakfast',129,['Idli batter|500 g','Coconut|100 g','Roasted gram|30 g','Sambar|250 ml','Curry leaves|5 g']],
['Thatte Idli Kit','Karnataka plate idli with spicy chutney pudi.','Breakfast',149,['Thatte idli batter|600 g','Chutney pudi|40 g','Coconut chutney|100 g','Ghee|15 g']],
['Rava Idli Kit','Instant semolina idli with vegetables and tempering.','Breakfast',139,['Rava|250 g','Curd|150 ml','Carrot|50 g','Cashews|20 g','Mustard tempering|15 g']],
['Masala Dosa Kit','Crisp dosa with potato palya and chutneys.','Breakfast',179,['Dosa batter|500 g','Potato|250 g','Onion|80 g','Coconut chutney|100 g','Sambar|250 ml']],
['Set Dosa Kit','Soft set dosas with vegetable saagu.','Breakfast',169,['Set dosa batter|500 g','Mixed vegetables|250 g','Coconut|60 g','Roasted gram|30 g']],
['Neer Dosa Kit','Delicate coastal rice crepes with coconut chutney.','Breakfast',159,['Neer dosa batter|500 g','Coconut|150 g','Green chilli|10 g','Coriander|10 g']],
['Akki Rotti Kit','Rice flour flatbread with Karnataka-style palya.','Breakfast',159,['Rice flour|300 g','Onion|80 g','Dill leaves|30 g','Green chilli|10 g','Coconut|40 g']],
['Pesarattu Kit','Andhra green gram dosa with ginger chutney.','Breakfast',169,['Green gram|300 g','Ginger|25 g','Green chilli|10 g','Onion|60 g','Tamarind chutney|80 g']],
['Ven Pongal Kit','Comforting pepper-cumin pongal with gothsu.','Breakfast',159,['Rice|200 g','Moong dal|100 g','Pepper-cumin mix|15 g','Cashews|20 g','Gothsu|180 g']],
['Upma Kit','Roasted rava upma with vegetables and cashews.','Breakfast',119,['Rava|250 g','Carrot|60 g','Beans|60 g','Peas|40 g','Cashews|15 g']],
['Poori Masala Kit','Fluffy poori with homestyle potato masala.','Breakfast',179,['Wheat flour|300 g','Potato|300 g','Onion|100 g','Green chilli|10 g','Sooji|20 g']],
['Mysore Masala Dosa Kit','Spiced red chutney dosa with potato filling.','Breakfast',189,['Dosa batter|500 g','Potato palya|250 g','Red chutney|70 g','Coconut chutney|100 g']],
['Bisi Bele Bath Kit','Karnataka one-pot rice, lentils and vegetables.','Rice Meals',199,['Rice|200 g','Toor dal|100 g','Mixed vegetables|250 g','Bisi bele bath powder|25 g','Tamarind|20 g']],
['Puliyogare Kit','Tangy tamarind rice with peanuts and spice mix.','Rice Meals',169,['Cooked rice|400 g','Tamarind paste|80 g','Puliyogare powder|35 g','Peanuts|40 g','Sesame oil|20 ml']],
['Lemon Rice Kit','Bright lemon rice with crunchy tempering.','Rice Meals',149,['Rice|400 g','Lemon|2 pcs','Peanuts|35 g','Green chilli|10 g','Curry leaves|5 g']],
['Curd Rice Kit','Cooling curd rice with pomegranate and tempering.','Rice Meals',139,['Rice|350 g','Curd|250 ml','Milk|50 ml','Pomegranate|50 g','Tempering|15 g']],
['Tomato Bath Kit','Karnataka-style tomato rice with fresh herbs.','Rice Meals',159,['Rice|350 g','Tomato|200 g','Onion|80 g','Bath powder|25 g','Coriander|10 g']],
['Vangi Bath Kit','Brinjal rice with freshly ground Karnataka masala.','Rice Meals',179,['Rice|350 g','Brinjal|200 g','Vangi bath powder|30 g','Peanuts|30 g','Tamarind|15 g']],
['Vegetable Pulao Kit','Fragrant vegetable pulao with raita.','Rice Meals',189,['Basmati rice|300 g','Mixed vegetables|200 g','Mint|15 g','Whole spices|10 g','Raita|150 g']],
['Coconut Rice Kit','Mild coconut rice with cashews and curry leaves.','Rice Meals',159,['Rice|350 g','Fresh coconut|120 g','Cashews|20 g','Green chilli|10 g','Curry leaves|5 g']],
['Sambar Rice Kit','Rice and lentils simmered with vegetables and sambar spice.','Rice Meals',179,['Rice|200 g','Toor dal|100 g','Drumstick|80 g','Pumpkin|80 g','Sambar powder|25 g']],
['Rasam Rice Kit','Peppery rasam with rice and traditional sides.','Rice Meals',149,['Rice|350 g','Tomato|100 g','Tamarind|25 g','Rasam powder|20 g','Pepper|5 g']],
['South Indian Meals Kit','Complete mini meals with rice, sambar, rasam and poriyal.','Meals',249,['Rice|350 g','Toor dal|100 g','Seasonal vegetables|250 g','Curd|150 ml','Pickle|30 g']],
['Jolada Rotti Kit','Jowar flatbread with ennegayi-style brinjal curry.','Meals',219,['Jowar flour|300 g','Brinjal|250 g','Peanuts|30 g','Sesame|20 g','Spice blend|20 g']],
['Ragi Mudde Kit','Finger millet balls with bassaru-style greens gravy.','Meals',189,['Ragi flour|250 g','Greens|150 g','Toor dal|80 g','Garlic|15 g','Spice mix|20 g']],
['Avarekalu Sambar Kit','Seasonal hyacinth beans in aromatic sambar.','Meals',199,['Avarekalu|200 g','Toor dal|100 g','Tomato|100 g','Sambar powder|25 g','Coconut|40 g']],
['Bendekai Palya Kit','Okra stir-fry with coconut and Karnataka spices.','Sides',129,['Okra|300 g','Coconut|50 g','Mustard|5 g','Chilli powder|8 g','Curry leaves|5 g']],
['Beans Poriyal Kit','Tender beans with coconut and mustard tempering.','Sides',119,['Beans|250 g','Coconut|60 g','Mustard|5 g','Urad dal|10 g','Curry leaves|5 g']],
['Vegetable Kurma Kit','Mixed vegetables in creamy coconut-spice gravy.','Sides',169,['Mixed vegetables|300 g','Coconut|100 g','Cashews|20 g','Poppy seeds|10 g','Whole spices|10 g']],
['Drumstick Sambar Kit','Traditional toor dal sambar with drumsticks.','Sides',149,['Toor dal|150 g','Drumstick|150 g','Tomato|100 g','Sambar powder|25 g','Tamarind|20 g']],
['Mangalore Rasam Kit','Coastal-style spicy rasam with roasted spice paste.','Sides',139,['Tomato|150 g','Tamarind|25 g','Coconut|40 g','Pepper|5 g','Rasam spice|20 g']],
['Coconut Chutney Kit','Fresh coconut chutney with tempering.','Sides',79,['Coconut|150 g','Roasted gram|30 g','Green chilli|10 g','Ginger|5 g','Tempering|10 g']],
['Maddur Vada Kit','Crisp onion and semolina patties, ready to fry.','Snacks',139,['Rice flour|100 g','Maida|100 g','Rava|50 g','Onion|100 g','Curry leaves|5 g']],
['Mangalore Buns Kit','Sweet banana puris with coconut and curd.','Snacks',149,['Ripe banana|2 pcs','Wheat flour|250 g','Curd|60 ml','Sugar|30 g','Cumin|5 g']],
['Mysore Bonda Kit','Soft inside, crisp outside urad dal bondas.','Snacks',129,['Urad dal batter|300 g','Pepper|5 g','Coconut|30 g','Green chilli|10 g','Curry leaves|5 g']],
['Holige / Obbattu Kit','Traditional sweet flatbread with chana dal filling.','Sweets',189,['Wheat flour|200 g','Chana dal|150 g','Jaggery|120 g','Cardamom|3 g','Ghee|20 g']]
];
async function main() {
  const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD||'';
  if(!email||password.length<12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) in Render.');
  const existing=await db.user.findUnique({where:{email}});
  if(existing&&existing.role!==Role.ADMIN) throw new Error('ADMIN_EMAIL already belongs to a non-admin account.');
  if(!existing) await db.user.create({data:{name:process.env.ADMIN_NAME||'HØmy Admin',email,passwordHash:await bcrypt.hash(password,12),role:Role.ADMIN}});
  let created=0;
  for(const [name,description,category,rupees,lines] of rows) {
    const found=await db.product.findFirst({where:{name}});
    if(found) continue;
    const imageUrl=photos[category];
    await db.product.create({data:{
      name,description,category,type:'VEG',pricePaise:rupees*100,imageUrl,
      servings:2,prepMinutes:25,isAvailable:true,
      ingredients:{create:lines.map((line,sortOrder)=>{const [ingredient,quantity]=line.split('|');return{name:ingredient,quantity,imageUrl,sortOrder};})},
      images:{create:[{imageUrl,sortOrder:0}]}
    }});
    created++;
  }
  console.log('HØmy seed complete. Added '+created+' menu dishes; admin account is ready.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
