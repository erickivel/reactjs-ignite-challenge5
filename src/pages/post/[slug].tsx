/* eslint-disable prettier/prettier */
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Link from 'next/link';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  preview: boolean;
}

export default function Post({ post, preview }: PostProps): JSX.Element {
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

    if (post.first_publication_date) {
      formattedPostDate = format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      );
    }

    formattedContent = post.data.content.map(content => {
      return {
        body: RichText.asHtml(content.body),
        heading: content.heading,
      };
    });
  }

  const lastEdition = post.last_publication_date
    ? format(
      new Date(post.last_publication_date),
      "dd MMM yyyy', às 'kk':'mm",
      {
        locale: ptBR,
      }
    )
    : null;

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

            <div className={styles.post_infos}>
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
              {lastEdition && (
                <footer>* editado em {lastEdition}</footer>
              )}
            </div>

            {formattedContent.map(content => (
              <section key={content.heading}>
                <strong>{content.heading}</strong>
                <div dangerouslySetInnerHTML={{ __html: content.body }} />
              </section>
            ))}

            <footer className={styles.other_posts}>
              <div>
                <p>Como utilizar Hooks</p>
                <strong>Post anterior</strong>
              </div>
              <div>
                <p>Criando um app CRA do Zero</p>
                <strong>Próximo post</strong>
              </div>
            </footer>

            {preview && (
              <aside>
                <Link href="/api/exit-preview">
                  <a>Sair do modo Preview</a>
                </Link>
              </aside>
            )}
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

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const slug = String(params.slug);

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', slug, {
    ref: previewData?.ref ?? null,
  });

  console.log(response);

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response?.last_publication_date,
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
      preview,
    },
  };
};
