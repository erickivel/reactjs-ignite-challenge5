import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

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
  return (
    <>
      <Header />

      <img className={styles.banner} src="/images/Banner.png" alt="banner" />

      <main className={`${commonStyles.container} ${styles.container}`}>
        <strong>{post.data.title}</strong>

        <small>
          <div>
            <FiCalendar />
            <time>{post.first_publication_date}</time>
          </div>

          <div>
            <FiUser />
            <span>{post.data.author}</span>
          </div>

          <div>
            <FiClock />
            <span>4 min</span>
          </div>
        </small>

        {post.data.content.map(content => (
          <section key={content.heading}>
            <strong>{content.heading}</strong>
            <div dangerouslySetInnerHTML={{ __html: content.body }} />
            {/* {content.body.map(body => (
              <div dangerouslySetInnerHTML={{ __html: body.text }} />
            ))} */}
          </section>
        ))}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // const prismic = getPrismicClient();
  // const posts = await prismic.query(TODO);
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = String(params.slug);

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', slug, {});

  const post = {
    // first_publication_date: format(
    //   new Date(response.first_publication_date),
    //   'dd MMM yyyy',
    //   {
    //     locale: ptBR,
    //   }
    // ),
    first_publication_date: response.first_publication_date,
    data: {
      uid: response.uid,
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          ...content,
          body: RichText.asHtml(content.body),
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
  };
};
