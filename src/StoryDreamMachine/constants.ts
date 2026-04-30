import { StoryData } from './types';

// Example: How to use a static image from the public folder
/*
  {
    id: 'local-test',
    imageUrl: '/story-images/my-local-picture.jpg', // Put your image in 'public/story-images/'
    imagePrompt: 'Static image description',
    title: '我的本地故事',
    disableAI: true, // This skips AI generation and uses the imageUrl above
    hotspots: [...],
    questions: [...]
  }
*/

export const STORIES: StoryData[] = [
  {
    id: 'planting-trees',
    imageUrl: '/story-images/planting-trees.jpg',
    disableAI: true,
    imagePrompt: 'A sunny spring day in a park. In the center, a straight young sapling is planted. On the left side, a young boy is digging a hole with a shovel, looking tired but happy with sweat on his forehead. On the right side, a young girl is carefully watering the sapling with a watering can. Swallows are flying in the warm sky with a bright sun.',
    title: '公园植树',
    hotspots: [
      { id: 'sun', x: 15, y: 15, label: '太阳/燕子', words: ['春天', '温暖'], audioText: '春天到了，太阳公公暖洋洋的，小燕子也飞回来啦！' },
      { id: 'boy', x: 40, y: 60, label: '小男孩', words: ['挖坑', '满头大汗'], audioText: '看，这个小男孩正在用力地挖坑，他干得满头大汗。' },
      { id: 'girl', x: 65, y: 60, label: '小女孩', words: ['浇水', '小心翼翼'], audioText: '小女孩提着水壶，正在小心翼翼地给小树苗浇水呢。' },
      { id: 'tree', x: 52, y: 55, label: '小树苗', words: ['茁壮', '笔挺'], audioText: '小树苗站得笔挺笔挺的，希望它能茁壮成长。' }
    ],
    questions: [
      { id: 'q1', question: '这是什么季节？天气怎么样呀？', hint: '可以观察一下太阳和燕子哦。', key: 'when' },
      { id: 'q2', question: '图上有谁？他们在哪里呢？', hint: '看看小朋友们在什么地方。', key: 'who_where' },
      { id: 'q3', question: '他们正在做什么动作？心情怎么样？', hint: '描述一下挖坑和浇水的样子。', key: 'what_how' }
    ]
  },
  {
    id: 'snowy-day',
    imageUrl: '/story-images/snowy-day.jpg',
    disableAI: true,
    imagePrompt: 'A magical snowy winter morning in a village. Everything is covered in thick white snow. In the foreground, two children are building a large snowman with a carrot nose and a red scarf. One child is putting on the snowman\'s arm (a branch), the other is rolling a small snowball. In the background, there are cozy houses with smoke coming from chimneys and snow-covered pine trees.',
    title: '雪地玩耍',
    hotspots: [
      { id: 'snowman', x: 50, y: 60, label: '大雪人', words: ['胖乎乎', '红围巾'], audioText: '一个胖乎乎的大雪人，戴着红围巾，真可爱！' },
      { id: 'boy', x: 35, y: 70, label: '小男孩', words: ['安手臂', '专心'], audioText: '小男孩正在专心地给雪人安手臂。' },
      { id: 'girl', x: 65, y: 75, label: '小女孩', words: ['滚雪球', '开心'], audioText: '小女孩在雪地上滚雪球，玩得真开心。' },
      { id: 'tree', x: 20, y: 40, label: '松树', words: ['银装素裹', '厚厚'], audioText: '松树上挂满了厚厚的白雪，像穿了白衣服。' }
    ],
    questions: [
      { id: 'q1', question: '这是什么季节？你怎么看出来的？', hint: '看看地上的颜色和树木。', key: 'when' },
      { id: 'q2', question: '小朋友们在做什么有趣的事？', hint: '观察雪人和他们的动作。', key: 'what' },
      { id: 'q3', question: '雪人长什么样？你觉得天气冷吗？', hint: '看看它的鼻子和围巾。', key: 'describe' }
    ]
  },
  {
    id: 'beach-summer',
    imageUrl: '/story-images/beach-summer.jpg',
    disableAI: true,
    imagePrompt: 'A vibrant summer beach scene. Golden sand and bright blue ocean waves. A child is sitting under a colorful striped umbrella, building a magnificent sandcastle with towers. Nearby, a colorful beach ball is on the sand, and a small crab is peeking out from behind a seashell. In the distance, a white sailboat is on the horizon under a clear blue sky.',
    title: '海滩假日',
    hotspots: [
      { id: 'castle', x: 50, y: 70, label: '沙堡', words: ['漂亮', '城堡'], audioText: '一座漂亮的沙子城堡，还有小旗子呢。' },
      { id: 'umbrella', x: 40, y: 60, label: '遮阳伞', words: ['五颜六色', '凉快'], audioText: '五颜六色的遮阳伞，挡住了火辣辣的太阳。' },
      { id: 'crab', x: 20, y: 80, label: '小螃蟹', words: ['害羞', '钻出来'], audioText: '一只害羞的小螃蟹从贝壳后面钻了出来。' },
      { id: 'boat', x: 85, y: 40, label: '帆船', words: ['白色', '远方'], audioText: '远方的蓝色大海上有一只白色的帆船。' }
    ],
    questions: [
      { id: 'q1', question: '这是在哪里？天气怎么样？', hint: '看看沙子和海水。', key: 'where' },
      { id: 'q2', question: '小朋友在忙着做什么？', hint: '观察沙堡。', key: 'what' },
      { id: 'q3', question: '你还发现了哪些可爱的小东西？', hint: '找找螃蟹和遮阳伞。', key: 'discover' }
    ]
  },
  {
    id: 'space-dream',
    imageUrl: '/story-images/space-dream.jpg',
    disableAI: true,
    imagePrompt: 'A magical night scene. A young boy is sitting on a lush green grassy hill under a giant, glowing full moon. He is looking up at the starry sky with wonder. Faintly visible in the clouds or as a thought bubble above him is a cool astronaut suit and a rocket ship. Fireflies are twinkling around him in the grass. The atmosphere is peaceful and dreamy.',
    title: '星空下的梦想',
    hotspots: [
      { id: 'boy', x: 50, y: 75, label: '小男孩', words: ['静静地', '仰望'], audioText: '小男孩静静地坐在草地上，望着美丽的星空。' },
      { id: 'moon', x: 20, y: 20, label: '大月亮', words: ['圆圆的', '明亮'], audioText: '圆圆的月亮挂在天上，把大地都照亮了。' },
      { id: 'stars', x: 70, y: 15, label: '繁星', words: ['闪烁', '无数'], audioText: '天上的星星眨着眼睛，好像在听小男孩说话。' },
      { id: 'dream', x: 55, y: 35, label: '航天梦', words: ['宇航员', '火箭'], audioText: '小男孩梦想着有一天能穿上宇航服，坐着火箭去太空！' },
      { id: 'fireflies', x: 30, y: 85, label: '萤火虫', words: ['闪闪', '小灯笼'], audioText: '草丛里的萤火虫提着小灯笼，陪着小男孩做梦。' }
    ],
    questions: [
      { id: 'q1', question: '现在是什么时间？天气怎么样？', hint: '看看月亮和星星。', key: 'when' },
      { id: 'q2', question: '小男孩在哪里？他在做什么？', hint: '观察 his 姿势和眼神。', key: 'who_where' },
      { id: 'q3', question: '小男孩的梦想是什么？', hint: '看看天空中那个穿宇航服的身影。', key: 'what_dream' },
      { id: 'q4', question: '如果你也坐在那里，你会想些什么？', hint: '发挥你的想象力。', key: 'feel' }
    ]
  },
  {
    id: 'park-fun',
    imageUrl: '/story-images/park-fun.jpg',
    disableAI: true,
    imagePrompt: 'A lively and colorful city park scene on a bright weekend morning. In the foreground, a group of children are playing: one is flying a colorful kite, another is sliding down a bright yellow slide, and two are playing on a seesaw. In the background, there is a sparkling blue lake with ducks, elderly people walking dogs on a winding path, and lush green trees and flower beds. The sky is clear blue with fluffy white clouds.',
    title: '热闹的公园',
    hotspots: [
      { id: 'kite', x: 20, y: 20, label: '风筝', words: ['五颜六色', '高飞'], audioText: '看！一只五颜六色的风筝在蓝天上飞得好高呀。' },
      { id: 'slide', x: 75, y: 65, label: '滑梯', words: ['滑下来', '开心'], audioText: '小朋友排着队从大滑梯上滑下来，真开心！' },
      { id: 'seesaw', x: 40, y: 80, label: '跷跷板', words: ['忽上忽下', '好伙伴'], audioText: '两个好伙伴在玩跷跷板，忽上忽下的真有趣。' },
      { id: 'lake', x: 80, y: 40, label: '小湖', words: ['波光粼粼', '鸭子'], audioText: '湖水波光粼粼的，几只小鸭子正在水里游来游去。' },
      { id: 'path', x: 15, y: 60, label: '小路', words: ['弯弯曲曲', '散步'], audioText: '人们在弯弯曲曲的小路上散步，呼吸着新鲜空气。' }
    ],
    questions: [
      { id: 'q1', question: '这是在什么地方？天气怎么样？', hint: '看看周围的树木和天空。', key: 'where' },
      { id: 'q2', question: '公园里的小朋友们都在玩什么？', hint: '找找风筝、滑梯和跷跷板。', key: 'what_playing' },
      { id: 'q3', question: '除了小朋友，你还看到了什么？', hint: '看看湖边和路边。', key: 'discover' },
      { id: 'q4', question: '你最喜欢公园里的哪个游乐设施？为什么？', hint: '说说你自己的想法。', key: 'feel' }
    ]
  },
  {
    id: 'helping-mom',
    imageUrl: '/story-images/helping-mom.jpg',
    disableAI: true,
    imagePrompt: 'A warm and cozy kitchen scene. A young child is happily helping their mother with housework. The child is standing on a small step stool, carefully drying a plastic plate with a soft towel. The mother is standing next to them, washing dishes in the sink and smiling warmly at the child. Sunlight is streaming through the window, illuminating some potted herbs on the sill. The kitchen is clean and filled with a sense of family love.',
    title: '帮妈妈做家务',
    hotspots: [
      { id: 'child', x: 45, y: 65, label: '勤劳的孩子', words: ['认真', '帮忙'], audioText: '小朋友正站在小凳子上，认真地帮妈妈擦盘子呢。' },
      { id: 'mom', x: 65, y: 55, label: '亲爱的妈妈', words: ['洗碗', '微笑'], audioText: '妈妈正在洗碗，看着懂事的孩子，露出了开心的微笑。' },
      { id: 'dishes', x: 55, y: 50, label: '干干净净', words: ['盘子', '闪闪发亮'], audioText: '盘子被洗得干干净净，在阳光下闪闪发亮。' },
      { id: 'window', x: 80, y: 30, label: '明亮的窗户', words: ['阳光', '温暖'], audioText: '温暖的阳光从窗户洒进来，厨房里亮堂堂的。' },
      { id: 'stool', x: 45, y: 85, label: '小凳子', words: ['垫高', '安全'], audioText: '为了能够到水槽，小朋友特意踩在了稳固的小凳子上。' }
    ],
    questions: [
      { id: 'q1', question: '这是在家里哪个房间？你是怎么看出来的？', hint: '看看周围的厨具和水槽。', key: 'where' },
      { id: 'q2', question: '小朋友正在做什么家务活？', hint: '观察他手里的动作。', key: 'what_doing' },
      { id: 'q3', question: '妈妈的心情看起来怎么样？为什么？', hint: '看看妈妈的表情。', key: 'mom_feeling' },
      { id: 'q4', question: '你在家里会帮爸爸妈妈做哪些家务呢？', hint: '分享一下你的劳动经验。', key: 'personal_exp' }
    ]
  },
  {
    id: 'rainy-umbrella',
    imageUrl: '/story-images/rainy-umbrella.jpg',
    disableAI: true,
    imagePrompt: 'A warm rainy school afternoon scene. Outside a school gate, a young child in a yellow raincoat shares a bright umbrella with a classmate who forgot theirs. A puddle reflects the umbrella, raindrops fall softly, a small schoolbag is held carefully, and a smiling teacher waves from the gate in the background. The mood is kind, cozy, and suitable for first-grade picture storytelling.',
    title: '雨天借伞',
    hotspots: [
      { id: 'umbrella', x: 50, y: 40, label: '彩色雨伞', words: ['撑开', '挡雨'], audioText: '一把彩色雨伞撑在两个小朋友头顶，帮他们挡住了雨点。' },
      { id: 'raincoat-child', x: 42, y: 62, label: '穿雨衣的孩子', words: ['黄色雨衣', '热心'], audioText: '穿黄色雨衣的小朋友很热心，把雨伞分给同学一起用。' },
      { id: 'classmate', x: 58, y: 62, label: '忘带伞的同学', words: ['靠近', '感谢'], audioText: '旁边的同学忘记带伞了，他靠近雨伞，心里一定很感谢。' },
      { id: 'puddle', x: 50, y: 82, label: '小水洼', words: ['倒影', '亮晶晶'], audioText: '地上的小水洼亮晶晶的，还映出了雨伞的颜色。' },
      { id: 'teacher', x: 80, y: 44, label: '老师', words: ['微笑', '挥手'], audioText: '校门口的老师微笑着挥手，看见小朋友互相帮助，真高兴。' }
    ],
    questions: [
      { id: 'q1', question: '这是什么天气？你从哪里看出来的？', hint: '看看雨点、雨伞和地上的水洼。', key: 'weather' },
      { id: 'q2', question: '两个小朋友在校门口做什么？', hint: '观察他们和雨伞的位置。', key: 'what_doing' },
      { id: 'q3', question: '穿雨衣的小朋友为什么要这样做？', hint: '想一想同学忘带伞时会怎么样。', key: 'why_help' },
      { id: 'q4', question: '如果你是被帮助的同学，你会说什么？', hint: '可以说一句感谢的话。', key: 'feeling' }
    ]
  },
  {
    id: 'dragon-boat-zongzi',
    imageUrl: '/story-images/dragon-boat-zongzi.jpg',
    disableAI: true,
    imagePrompt: 'A cheerful Dragon Boat Festival family scene. In a cozy bright kitchen, a child and grandmother sit at a wooden table wrapping zongzi with green bamboo leaves. Bowls of sticky rice and red dates are on the table. Through an open window in the background, a small river shows colorful dragon boats far away. The room feels festive, loving, and suitable for first-grade picture storytelling.',
    title: '端午包粽',
    hotspots: [
      { id: 'grandma', x: 34, y: 52, label: '奶奶', words: ['耐心', '教'], audioText: '奶奶坐在桌边，耐心地教小朋友包粽子。' },
      { id: 'child', x: 55, y: 56, label: '小朋友', words: ['认真', '学习'], audioText: '小朋友认真地学着把粽叶折起来，样子很专心。' },
      { id: 'zongzi', x: 48, y: 70, label: '粽子', words: ['绿绿的', '香喷喷'], audioText: '桌上有绿绿的粽叶和香喷喷的粽子，看起来真有节日味道。' },
      { id: 'ingredients', x: 70, y: 66, label: '糯米红枣', words: ['白白的', '甜甜的'], audioText: '碗里放着白白的糯米和甜甜的红枣，是包粽子的材料。' },
      { id: 'dragon-boat', x: 82, y: 28, label: '龙舟', words: ['热闹', '比赛'], audioText: '窗外的小河上有彩色的龙舟，远处好像正在热闹地比赛。' }
    ],
    questions: [
      { id: 'q1', question: '这是哪个传统节日？你看到了什么？', hint: '看看桌上的粽叶和粽子。', key: 'festival' },
      { id: 'q2', question: '奶奶和小朋友正在做什么？', hint: '观察他们手里的动作。', key: 'what_doing' },
      { id: 'q3', question: '桌子上有哪些包粽子的材料？', hint: '找找粽叶、糯米和红枣。', key: 'materials' },
      { id: 'q4', question: '你觉得家里一起过节是什么感觉？', hint: '可以说说温暖、开心或热闹。', key: 'feeling' }
    ]
  },
  {
    id: 'library-reading',
    imageUrl: '/story-images/library-reading.jpg',
    disableAI: true,
    imagePrompt: 'A quiet and delightful library reading scene. A young child sits by a low round table reading a colorful picture book. A friendly librarian places another book on the table. Neat bookshelves, a small potted plant, a sunny window, and a soft reading rug make the library peaceful. The scene is suitable for first-grade picture storytelling.',
    title: '图书馆阅读',
    hotspots: [
      { id: 'child', x: 42, y: 60, label: '读书的孩子', words: ['安静', '专心'], audioText: '小朋友坐在桌边安静地读书，读得特别专心。' },
      { id: 'picture-book', x: 48, y: 68, label: '图画书', words: ['有趣', '彩色'], audioText: '桌上的图画书又有趣又漂亮，里面一定藏着精彩的故事。' },
      { id: 'librarian', x: 68, y: 52, label: '图书管理员', words: ['亲切', '推荐'], audioText: '亲切的图书管理员又拿来一本书，想推荐给小朋友。' },
      { id: 'bookshelf', x: 22, y: 38, label: '书架', words: ['整整齐齐', '许多书'], audioText: '书架上的书摆得整整齐齐，像一排排小士兵。' },
      { id: 'window', x: 82, y: 32, label: '阳光窗户', words: ['明亮', '温暖'], audioText: '温暖的阳光从窗户照进来，图书馆里安静又明亮。' }
    ],
    questions: [
      { id: 'q1', question: '这是在什么地方？你怎么看出来的？', hint: '看看书架、桌子和图画书。', key: 'where' },
      { id: 'q2', question: '小朋友正在做什么？他的样子怎么样？', hint: '观察他的姿势和表情。', key: 'what_doing' },
      { id: 'q3', question: '图书管理员在做什么？', hint: '看看她手里的书。', key: 'librarian' },
      { id: 'q4', question: '你喜欢读什么书？为什么？', hint: '说说你自己的阅读经验。', key: 'personal_exp' }
    ]
  },
  {
    id: 'autumn-orchard',
    imageUrl: '/story-images/autumn-orchard.jpg',
    disableAI: true,
    imagePrompt: 'A bright autumn orchard scene. Two children pick red apples in a golden orchard. One child carefully reaches for an apple on a low branch while another child holds a small basket filled with apples. Yellow leaves float in the air, a little rabbit peeks from behind the grass, and warm sunlight shines through the trees. The scene is cheerful and suitable for first-grade picture storytelling.',
    title: '秋天果园',
    hotspots: [
      { id: 'apple-tree', x: 44, y: 34, label: '苹果树', words: ['红彤彤', '挂满'], audioText: '苹果树上挂满了红彤彤的大苹果，看起来真诱人。' },
      { id: 'picking-child', x: 38, y: 62, label: '摘苹果的孩子', words: ['踮脚', '小心'], audioText: '一个小朋友踮起脚，小心地去摘树枝上的苹果。' },
      { id: 'basket-child', x: 60, y: 66, label: '提篮子的孩子', words: ['篮子', '收获'], audioText: '另一个小朋友提着篮子，里面已经装了好多苹果，真是大丰收。' },
      { id: 'leaves', x: 70, y: 28, label: '落叶', words: ['金黄', '飘落'], audioText: '金黄的树叶从空中轻轻飘落，告诉我们秋天来了。' },
      { id: 'rabbit', x: 78, y: 78, label: '小兔子', words: ['探头', '可爱'], audioText: '草丛里有一只可爱的小兔子探出头，好像也想看看红苹果。' }
    ],
    questions: [
      { id: 'q1', question: '这是什么季节？你从哪里发现的？', hint: '看看树叶和果树。', key: 'season' },
      { id: 'q2', question: '两个小朋友在果园里做什么？', hint: '观察摘苹果和提篮子的动作。', key: 'what_doing' },
      { id: 'q3', question: '果园里的苹果和树叶是什么样的？', hint: '可以用颜色和形状来描述。', key: 'describe' },
      { id: 'q4', question: '如果你也摘到了苹果，你会怎么做？', hint: '可以说说分享或品尝。', key: 'feeling' }
    ]
  },
  {
    id: 'classroom-duty',
    imageUrl: '/story-images/classroom-duty.jpg',
    disableAI: true,
    imagePrompt: 'A sunny classroom cleaning duty scene. After class, several children work together happily: one child wipes the blackboard with a cloth, one sweeps the floor with a broom, one waters a green plant near the window, and another arranges books on a low shelf. Sunlight comes through the window, desks are tidy, and the classroom feels clean and cooperative. The scene is suitable for first-grade picture storytelling.',
    title: '教室值日',
    hotspots: [
      { id: 'blackboard', x: 32, y: 38, label: '擦黑板', words: ['认真', '干净'], audioText: '一个小朋友正在认真地擦黑板，把黑板擦得干干净净。' },
      { id: 'broom', x: 48, y: 70, label: '扫地', words: ['弯腰', '仔细'], audioText: '一个小朋友拿着扫把弯腰扫地，连角落也不放过。' },
      { id: 'plant', x: 76, y: 58, label: '浇花', words: ['绿油油', '照顾'], audioText: '窗边的小朋友正在给绿油油的植物浇水，照顾得很细心。' },
      { id: 'books', x: 66, y: 72, label: '整理图书', words: ['整齐', '合作'], audioText: '还有小朋友在整理图书，大家一起合作让教室变整齐。' },
      { id: 'sunlight', x: 84, y: 26, label: '阳光', words: ['明亮', '暖暖的'], audioText: '暖暖的阳光照进教室，干净的教室变得更明亮了。' }
    ],
    questions: [
      { id: 'q1', question: '这是在哪里？小朋友们为什么留下来？', hint: '看看黑板、桌椅和扫把。', key: 'where_why' },
      { id: 'q2', question: '图上的小朋友分别在做什么？', hint: '找找擦黑板、扫地、浇花和整理书。', key: 'what_doing' },
      { id: 'q3', question: '他们合作得怎么样？', hint: '观察每个人是不是都在认真做事。', key: 'teamwork' },
      { id: 'q4', question: '教室打扫干净后，大家心情会怎么样？', hint: '可以说开心、自豪或舒服。', key: 'feeling' }
    ]
  },
  {
    id: 'market-vegetables',
    imageUrl: '/story-images/market-vegetables.jpg',
    disableAI: true,
    imagePrompt: 'A lively but orderly morning vegetable market scene. A child helps mother choose fresh vegetables at a friendly stall. The child holds a small cloth bag with tomatoes and carrots. A smiling vendor points to leafy greens. Baskets of vegetables, a scale without numbers, and a small cat sitting safely beside the stall add detail. The market is colorful but not crowded. The scene is suitable for first-grade picture storytelling.',
    title: '菜市场买菜',
    hotspots: [
      { id: 'mother-child', x: 42, y: 58, label: '妈妈和孩子', words: ['挑选', '帮忙'], audioText: '妈妈带着小朋友在菜摊前挑选蔬菜，小朋友也在认真帮忙。' },
      { id: 'vegetables', x: 56, y: 66, label: '新鲜蔬菜', words: ['绿油油', '红彤彤'], audioText: '摊位上有绿油油的青菜、红彤彤的西红柿，还有胡萝卜。' },
      { id: 'vendor', x: 72, y: 48, label: '摊主', words: ['热情', '介绍'], audioText: '热情的摊主正指着新鲜蔬菜，给妈妈和小朋友介绍。' },
      { id: 'cloth-bag', x: 40, y: 72, label: '布袋', words: ['环保', '装菜'], audioText: '小朋友手里拿着布袋，可以把买好的蔬菜装进去，很环保。' },
      { id: 'cat', x: 82, y: 78, label: '小猫', words: ['乖乖', '蹲着'], audioText: '菜摊旁边有一只小猫乖乖地蹲着，好奇地看着大家买菜。' }
    ],
    questions: [
      { id: 'q1', question: '这是在什么地方？你看到了哪些蔬菜？', hint: '看看菜摊和篮子里的颜色。', key: 'where_vegetables' },
      { id: 'q2', question: '小朋友和妈妈正在做什么？', hint: '观察他们站在哪里、手里拿着什么。', key: 'what_doing' },
      { id: 'q3', question: '摊主看起来怎么样？他可能在说什么？', hint: '看看摊主的动作和表情。', key: 'vendor' },
      { id: 'q4', question: '如果你去买菜，你会帮忙做什么？', hint: '可以说挑菜、提袋子或付钱。', key: 'personal_exp' }
    ]
  }
];

export const PLANTING_TREES_STORY = STORIES[0];
