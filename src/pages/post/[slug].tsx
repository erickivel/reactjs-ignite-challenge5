import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { useRouter } from 'next/router';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  let formattedPostDate: string;
  let formattedContent;
  let readingTime: number;

  if (!router.isFallback) {
    const contentFormattedAsText = post.data.content.reduce((acc, content) => {
      acc += ` ${content.heading} `;
      acc += ` ${RichText.asText(content.body)} `;

      return acc;
    }, '');

    const postCountWords = contentFormattedAsText.split(' ').length;
    readingTime = Math.ceil(postCountWords / 200);

    console.log(readingTime);

    formattedPostDate = format(
      new Date(post.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    );

    formattedContent = post.data.content.map(content => {
      return {
        body: RichText.asHtml(content.body),
        heading: content.heading,
      };
    });
  }

  return (
    <>
      <Header />

      {router.isFallback ? (
        <strong>Carregando...</strong>
      ) : (
        <>
          <img
            className={styles.banner}
            src={post.data.banner.url}
            alt="banner"
          />

          <main className={`${commonStyles.container} ${styles.container}`}>
            <strong>{post.data.title}</strong>

            <small>
              <div>
                <FiCalendar />
                <time>{formattedPostDate}</time>
              </div>

              <div>
                <FiUser />
                <span>{post.data.author}</span>
              </div>

              <div>
                <FiClock />
                <span>{readingTime} min</span>
              </div>
            </small>

            {formattedContent.map(content => (
              <section key={content.heading}>
                <strong>{content.heading}</strong>
                <div dangerouslySetInnerHTML={{ __html: content.body }} />
              </section>
            ))}
          </main>
        </>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  return {
    paths: posts.results.map(post => {
      return {
        params: { slug: post.uid },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = String(params.slug);

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', slug, {});

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
  };
};
