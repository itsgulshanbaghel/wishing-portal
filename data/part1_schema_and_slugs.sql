-- 1. Schema Tables
CREATE TABLE IF NOT EXISTS free_records (
  id TEXT PRIMARY KEY,
  recipient_name TEXT,
  event_type TEXT,
  template_name TEXT,
  is_premium INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  slug TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS premium_records (
  id TEXT PRIMARY KEY,
  recipient_name TEXT,
  event_type TEXT,
  template_name TEXT,
  is_premium INTEGER DEFAULT 1,
  views INTEGER DEFAULT 0,
  slug TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS custom_slugs (
  slug TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  order_id TEXT PRIMARY KEY,
  website_id TEXT,
  slug TEXT,
  plan TEXT,
  plan_name TEXT,
  amount REAL,
  currency TEXT,
  status TEXT,
  payment_method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

-- Custom Slugs Data
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('advikaaaa-baby', '0tfeejvq9m', '2026-08-31T15:50:40.299Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('advikaaaa-baby2709', '0tfeejvq9m', '2026-08-31T15:52:36.218Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('advikaaaa-baby9072', '0tfeejvq9m', '2026-08-31T15:54:05.617Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('alfaiz-malek', 'ri9bujhd1l', '2026-09-18T18:52:56.640Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('anbarasan', 'rsrcduyeuj', '2026-09-08T04:09:42.588Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('angel', 'r7uqrt9yuk', '2026-09-06T15:04:30.599Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('angelation', '0vtcao5ncp', '2026-09-11T07:56:15.183Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('ankii', '3g2665uy9o', '2026-08-31T17:41:12.015Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('babe', '8k66ef9xb9', '2026-09-12T16:00:56.074Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('babuu', 'y6c4o2yuwn', '2026-09-08T06:33:36.399Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('betuu', 'ru8dxzqpdz', '2026-08-26T08:59:11.428Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('bhavya-ji', 'm7nafu38q8', '2026-09-11T14:45:44.695Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('bijeta-kumari', 'vq2stauiy8', '2026-09-09T13:14:57.237Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('chandrahasa', '9rvw2l6rpe', '2026-09-16T16:53:58.340Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('ddsbirthday', 'f33dsf837v', '2026-09-18T17:37:22.710Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('ehwebsitetokhol', 'njlshqv4hs', '2026-08-29T03:02:42.572Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('gauri', 'qu0bxuo74w', '2026-09-08T20:10:58.432Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('gudiya-raani', 'hm0djjv9wp', '2026-09-01T03:30:25.139Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('gulshannnn', 'j0x08zo7hp', '2026-09-07T16:57:57.837Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('haniya-bachhuu', 'b0eyrpxxcf', '2026-09-04T16:52:22.966Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('happyybirthdaybhutkii', '6rqrfydmh0', '2026-09-11T17:53:50.590Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('hasan-uncle', '9b9uyyhnj4', '2026-09-05T13:11:16.317Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('kaju-katli', '3x70o8dicy', '2026-09-08T23:15:36.272Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('khushi', 'f550twcof0', '2026-09-12T10:40:10.597Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('madam-ji', 'e1heksn7js', '2026-08-31T15:02:17.610Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('madam-jii', 'e1heksn7js', '2026-08-31T15:08:41.022Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('mahi-singh', 'nhynebu3yr', '2026-09-05T02:10:45.101Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('mahima-my-queen', 'xeph6a3mq2', '2026-09-10T14:28:35.934Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('meri-jaan', '1iks4osg6j', '2026-09-06T14:50:31.949Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('mousom', 's2xl8pe4mu', '2026-09-12T20:35:16.849Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('mugdha', 'euyarz1ngz', '2026-09-10T13:48:41.976Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('my-sarkar-happybirthday', 'n85mo2hrip', '2026-08-28T18:00:55.545Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('mybabe', '1653wu8036', '2026-09-13T04:56:21.574Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('navya-raga', '98brk5cilb', '2026-08-27T11:30:17.827Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('neha-bubu-meri-apsraa', 'rlbee0v8ih', '2026-09-04T17:18:41.804Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('nehuuu', '2vbq03qygu', '2026-08-31T17:36:52.354Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('nicolsitaa', 'buso3bdvt3', '2026-09-14T06:29:13.550Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('piu', 'd4wulya4a0', '2026-09-06T08:43:46.487Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('radhika', 'joufomtr4u', '2026-09-09T17:43:56.216Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('rammm', '31q8dl05jp', '2026-09-13T13:35:52.069Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('ridhima-didi', '6z5ohqnv0w', '2026-08-28T20:06:32.386Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('rohit', '7wkfbwf02l', '2026-09-10T10:10:34.805Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sakshi-agrawal', 'gcxzdxro47', '2026-08-26T08:24:05.498Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sangavi', 'j30wq548r9', '2026-09-08T16:49:07.014Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sanjana-maity', 'h5dn439fni', '2026-09-13T10:17:55.198Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('shaanaaamol', 'wwpatf5aw4', '2026-09-01T15:09:14.983Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sharu-muuu', '93fts29zh8', '2026-09-06T07:38:15.851Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('shivani', 'wezhk142eq', '2026-09-08T14:50:44.111Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('shrishti', 'bmlfgk603n', '2026-08-31T18:10:47.041Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('smriti-sihotra', 'lmtiemu8hn', '2026-09-10T14:16:01.906Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sravanuu', 'h5wxmy48go', '2026-09-07T17:41:07.961Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sravanuuuu', 'daopktf8cf', '2026-09-07T17:13:56.136Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('sravanuuuuuuuu', 'b8o3blkxgp', '2026-09-07T17:52:58.652Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('tasnim', 'qapbpmdbiq', '2026-09-03T01:32:32.956Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('vaishu', 'kkc2t5anb5', '2026-08-31T17:19:18.450Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('vanshika', 'ynomgi5szu', '2026-09-02T07:34:46.481Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('varsha', 'okg12zdgkd', '2026-09-06T11:01:02.151Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('vishal', 's817nnatfv', '2026-09-07T07:30:28.690Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-04pasp', '9b9uyyhnj4', '2026-09-05T13:10:15.672Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-0kzh9q', 'joufomtr4u', '2026-09-09T17:42:58.790Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-0kzuu9', 'bh3wv68fgr', '2026-09-09T06:54:38.295Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-0uwd4r', 'qapbpmdbiq', '2026-09-03T01:32:02.763Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-13joep', '8tufgftu2v', '2026-09-12T16:52:15.080Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1418dy', 'k3xsc6v43w', '2026-09-07T17:46:27.990Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1g1xko', 'pp4zxbwm44', '2026-09-04T13:29:18.529Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1g8o6b', '4lspa0eeb3', '2026-09-07T16:39:50.959Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1jew4m', 'kkc2t5anb5', '2026-08-31T17:14:50.204Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1vd5zq', '1653wu8036', '2026-09-13T04:55:03.170Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-1wgx5p', 'v7lqjdymnw', '2026-09-11T14:01:31.567Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-2f70em', 'xo197dlo6k', '2026-09-04T13:03:04.600Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-2ovqpw', 'rs1gvph1hl', '2026-09-11T03:19:00.298Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-2p3pzj', '3m3w6tmnho', '2026-09-08T04:15:10.428Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-2sza4g', '3pmec2fw7y', '2026-09-12T12:03:58.443Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-2yxnqj', '7rilpkwzv2', '2026-09-10T07:16:51.412Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-384xww', '91jjjorenm', '2026-09-06T12:10:55.012Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-38mp3f', '0vtcao5ncp', '2026-09-11T07:51:08.910Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-39e0vu', 'vp07v77wh7', '2026-09-17T08:46:55.961Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-3mri4t', 'v9fuz1fh3h', '2026-09-09T20:19:14.045Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-3mv4ck', '7w5g24klz6', '2026-09-01T13:40:12.516Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-425zyq', 'upki2cxn86', '2026-09-06T21:23:44.638Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-42jmpw', '992xizd5sl', '2026-09-13T14:52:48.689Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-45o4x3', 'gkdr9r2ps4', '2026-09-17T19:53:16.806Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-4d6c7b', 'yz91mug5ih', '2026-09-14T17:52:55.506Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-4mg0xo', '67b4whlmhx', '2026-09-07T16:28:27.453Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-5c69nf', 'aejl2j7l3u', '2026-09-08T13:15:25.134Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-5cwz6n', 'wezhk142eq', '2026-09-08T14:48:17.266Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-6awbgi', 'emmsrphc6v', '2026-09-17T16:49:49.351Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-6clnqa', 'o16qcgo2kp', '2026-09-18T16:52:08.355Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-7w0f8y', 'eyod9gkava', '2026-09-04T20:23:26.049Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-7xjh6r', '7edq0hq5o2', '2026-09-03T14:58:02.122Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-81ipb2', '2vbq03qygu', '2026-08-31T17:36:10.476Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-85qle1', 'poq8ksbe0i', '2026-09-08T16:22:31.343Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-88xj29', 'amatomx5fl', '2026-09-07T16:23:35.684Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-8i5n0v', '1iks4osg6j', '2026-09-06T14:47:53.988Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-8lsc6b', 'zgzjs95aks', '2026-09-06T17:25:28.805Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-8oneno', 'b8o3blkxgp', '2026-09-07T17:52:23.908Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-8pim4h', 'rsrcduyeuj', '2026-09-08T04:07:20.240Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-8sfcm2', 'bmlfgk603n', '2026-08-31T18:09:29.796Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-96ghl1', '9n7o8y07l3', '2026-09-17T08:05:45.123Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-99zt8o', 'xeph6a3mq2', '2026-09-10T14:26:25.904Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-9e59xp', 'ze5a144gfe', '2026-08-25T17:40:42.947Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-9fr7i7', '30jjvmp1tb', '2026-09-08T20:13:17.406Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-9nbn21', '4emkofb9zn', '2026-09-15T17:41:08.415Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-9oj1ur', 'dsdjno6tys', '2026-09-11T17:14:59.547Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-a8icb5', 'i8ln63hh0c', '2026-09-06T12:40:35.115Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-afmw27', 'f33dsf837v', '2026-09-18T17:35:33.668Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-awuqud', 'ddlibbdyt2', '2026-09-03T18:20:15.071Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-b6aph8', 'pkpcq3skxs', '2026-09-16T14:52:34.496Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-b6y6hz', 's2xl8pe4mu', '2026-09-12T20:27:13.556Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-bbkvus', 'b0eyrpxxcf', '2026-09-04T16:43:00.134Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-bffrij', 'ptacuk4iyq', '2026-09-08T18:08:32.961Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-bgbjf4', 'ygmx2bo5rx', '2026-09-18T14:56:48.474Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-bx4shv', '1eiyo0rnqr', '2026-09-09T03:41:56.899Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-c04ij9', 'p50m7t1ecz', '2026-09-01T12:47:35.003Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-c65h5w', 'hm0djjv9wp', '2026-09-01T03:29:35.525Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ckq9fz', 'buso3bdvt3', '2026-09-14T06:18:54.508Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-cvhzio', '2bt1oi1y5c', '2026-09-13T16:00:51.983Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-d2bmse', '8k66ef9xb9', '2026-09-12T15:58:37.965Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-dbsm8e', 'ynomgi5szu', '2026-09-02T08:11:59.736Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-dojx2u', 'haiamxibug', '2026-09-05T18:01:00.948Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-dxzmt2', 'psv5xytmfj', '2026-09-18T01:43:59.067Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-e8ob70', '4o72avd3o3', '2026-09-14T15:47:46.353Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-eboc7x', 'okg12zdgkd', '2026-09-06T10:59:27.879Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ebrk8u', 'kwy60inby0', '2026-09-18T19:55:40.549Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-faz82f', 'fand625p0m', '2026-09-04T10:03:06.905Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-foj37t', 'fa12knzq5y', '2026-09-17T20:24:31.772Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-fvum4u', '1micd9yhjl', '2026-09-09T15:04:15.063Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-fwojay', 'r7uqrt9yuk', '2026-09-06T15:03:26.824Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-fzu4my', 'wwpatf5aw4', '2026-09-01T15:06:59.167Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-g0vk59', '1whwv6staq', '2026-09-13T18:03:52.404Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-g11fz2', 'h5wxmy48go', '2026-09-07T17:39:47.590Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-g47l91', '2jyi5sfztv', '2026-08-27T19:13:27.836Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-gb67wa', 'k2wea0e823', '2026-09-13T23:18:38.711Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-gi8nw9', 'ilisfwq7g0', '2026-09-06T17:35:09.411Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-gor0gp', '4hj0ap87d0', '2026-09-12T14:02:27.875Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-gq7884', 'w57wh0g19c', '2026-09-04T17:44:07.094Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-h3wg5a', 'aic4g1k5nx', '2026-09-05T09:36:01.633Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-hiyd3t', 'daopktf8cf', '2026-09-07T17:13:23.148Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-hrq4u6', 'd6vttqp85p', '2026-09-12T07:58:58.489Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-i2l6kw', 'pleov1mnzt', '2026-09-09T19:36:32.397Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ijbea8', 'rtnomxn2v7', '2026-09-15T11:24:10.597Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-io1nnb', 's37izuyywu', '2026-09-07T17:36:08.325Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-isln21', 'm2shryx2ju', '2026-09-10T14:49:50.154Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-j09lp4', 'f550twcof0', '2026-09-12T10:39:18.624Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jac678', 'j30wq548r9', '2026-09-08T16:03:51.426Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jb9vl0', '3g2665uy9o', '2026-08-31T17:38:29.588Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jde2j2', 'd4wulya4a0', '2026-09-06T08:40:46.620Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jkozyf', '1ed85797g7', '2026-09-12T07:55:49.310Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jmfhhm', 'oo08n3jqom', '2026-09-15T17:49:39.644Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-jp9obm', '3x70o8dicy', '2026-09-08T23:14:26.897Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-k59h1n', '9rvw2l6rpe', '2026-09-16T16:51:29.383Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-kaifce', 'xgn6iodm9z', '2026-09-04T20:02:49.096Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-kkxcyc', '5pn16lwu1g', '2026-09-09T09:31:02.025Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-kmodis', 'n9q8c1glym', '2026-09-10T09:40:19.126Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ktsv4r', '7wkfbwf02l', '2026-09-10T10:08:55.363Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-kxbzhu', 'qu0bxuo74w', '2026-09-08T20:10:02.324Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-kz3pv8', 'cf98p2pfzm', '2026-09-10T05:07:05.208Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-l6nxd5', 'km514spadm', '2026-09-06T17:58:58.708Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-l8m7w3', 'a20x45hg8b', '2026-09-07T18:00:53.350Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-lfmbqh', 'mjqn1o9nkg', '2026-09-15T06:13:41.540Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-liegnv', '79zug24psg', '2026-09-16T05:50:46.805Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-lk9dvm', 'jns3nm0s6z', '2026-09-04T10:14:27.700Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-m5krug', 'leztskg0g9', '2026-09-10T06:34:58.484Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-mokc9d', 'uwzgc2sf6f', '2026-09-18T10:26:37.780Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-mt7bpj', 'y6c4o2yuwn', '2026-09-08T06:30:54.086Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-myq5e8', 'qtnlm4nwri', '2026-09-09T18:35:00.684Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-n28x71', '4pxbw15xr4', '2026-09-04T19:48:56.834Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ndvkqy', 'j0x08zo7hp', '2026-09-07T16:53:43.125Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-nyq11s', 'x52jzec8ps', '2026-09-01T12:54:03.341Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-oj0g14', 'a6jkdxta78', '2026-09-01T22:12:11.584Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pak25s', 'grarfbbuq5', '2026-09-16T18:16:24.975Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pfm7am', '1nwqyo3h0k', '2026-09-18T17:20:40.228Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pjp778', 's817nnatfv', '2026-09-07T07:29:10.188Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pkxvqh', 'wa10i6e18t', '2026-09-08T18:33:05.599Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pozt00', 'j30wq548r9', '2026-09-08T16:46:49.114Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-pzop0q', 'ynomgi5szu', '2026-09-02T07:33:09.789Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-qdce4r', '3m3w6tmnho', '2026-09-08T04:06:14.813Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-r6ckj9', 'chr379fbu8', '2026-09-08T18:28:44.917Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-r6pfly', '8s189azhxl', '2026-09-04T18:11:11.049Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-rblmm7', 'c6id6bmzzm', '2026-09-13T11:47:20.429Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-rdane9', 'h8obgx0891', '2026-09-03T18:56:41.642Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-rscsfx', '9kez6249ur', '2026-08-30T16:20:06.893Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-rxssm1', '0zuzldxhe0', '2026-08-25T15:30:00.174Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-s0iat3', 'j48468t4g5', '2026-09-04T12:35:19.899Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-s38hsd', 'h4lsqopy9j', '2026-09-16T08:14:32.897Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-s5hqdj', 'euyarz1ngz', '2026-09-10T13:46:58.975Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-scn0ez', '0ncopv9r50', '2026-09-02T15:49:23.243Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-sh98hw', 'h5dn439fni', '2026-09-13T10:15:49.238Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-su593r', '1pfjkvw7qk', '2026-09-13T10:39:33.869Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-suudn0', 'm7nafu38q8', '2026-09-11T14:39:11.407Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-syowzc', 'dplkztdfg0', '2026-09-12T18:54:34.076Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-tg3v72', 'xc72sane2i', '2026-09-03T14:58:35.360Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-tgtq8j', 'lov8cw1qis', '2026-09-13T12:16:51.827Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-tyk5rj', 'ri9bujhd1l', '2026-09-18T18:48:36.346Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-udaegw', 'nhynebu3yr', '2026-09-05T02:05:18.966Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-unsk2g', 'vq2stauiy8', '2026-09-09T13:06:10.968Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-uzkf1v', 'pw8kfdv3z7', '2026-09-16T08:11:27.829Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-vdhtqq', 'g3il2qjcqh', '2026-09-02T18:29:19.785Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-vdya3z', 'g8txsvytln', '2026-09-11T09:41:59.219Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-vjyhcf', 'rlbee0v8ih', '2026-09-04T17:17:44.390Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-vv7tut', '6rqrfydmh0', '2026-09-11T17:53:04.268Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-wil0sb', '31q8dl05jp', '2026-09-13T13:35:12.903Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-wmyp04', '9aecroghcl', '2026-08-27T13:56:37.614Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-wyuf4o', 'jc1v3hs8pc', '2026-09-06T15:27:56.521Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-xam1vc', 'dr43q39wlv', '2026-09-10T16:39:32.705Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-xmjavr', '1zfnwqkt0d', '2026-09-10T10:02:12.535Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-xqtvfg', 'noxuqcl2zq', '2026-09-03T06:14:59.002Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-yafe1s', 'cd6hck4meo', '2026-09-01T12:02:48.547Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-yhoq2l', 'lmtiemu8hn', '2026-09-10T14:15:26.751Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-yjeg6z', '2ud0qundyl', '2026-08-27T20:46:58.277Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-zpsq1j', '1tanb2l1x3', '2026-09-02T22:35:29.787Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-ztc6wd', '93fts29zh8', '2026-09-06T07:35:17.504Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-zxemyc', 'zvhk7ug10e', '2026-09-13T07:30:12.757Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('wish-zxpscb', 'site_1788157643189', '2026-09-01T04:42:56.538Z');
INSERT OR REPLACE INTO custom_slugs (slug, website_id, created_at) VALUES ('zufiyah', 'j48468t4g5', '2026-09-04T12:36:22.011Z');
