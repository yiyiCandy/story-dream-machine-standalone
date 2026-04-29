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
  }
];

export const PLANTING_TREES_STORY = STORIES[0];
