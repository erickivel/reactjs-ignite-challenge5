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
import { useUtterances } from '../../hooks/useUtterances';

interface Post {
  uid: string;
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

interface OtherPosts {
  uid: string;
  first_publication_date: string | null;
  title: string
}

interface PostProps {
  post: Post;
  preview: boolean;
  previousPost: OtherPosts | null;
  nextPost: OtherPosts | null;
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost
}: PostProps): JSX.Element {
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


  // Comments Section With Uterrances
  const commentNodeId = 'comments';
  useUtterances(commentNodeId);

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

            {(previousPost || nextPost) && (
              <footer className={styles.other_posts}>
                {previousPost ? (
                  <Link href={`/post/${previousPost.uid}`} passHref >
                    <a>
                      <p>{previousPost.title}</p>
                      <strong>Post anterior</strong>
                    </a>
                  </Link>
                ) : (
                  // To put the next post div to the side
                  <div />
                )}
                {nextPost && (
                  <Link href={`/post/${nextPost.uid}`} passHref >
                    <a>
                      <p>{nextPost.title}</p>
                      <strong>Próximo post</strong>
                    </a>
                  </Link>
                )}
              </footer>
            )}



            {preview && (
              <Link href="/api/exit-preview">
                <aside>
                  <a>Sair do modo Preview</a>
                </aside>
              </Link>
            )}

            <div id={commentNodeId} className={styles.comments} />
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
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      ref: previewData?.ref ?? null,
    }
  );

  const currentPostIndex = postsResponse.results.findIndex(p => p.uid === slug);

  const currentPost = postsResponse.results[currentPostIndex];

  const post = {
    first_publication_date: currentPost.first_publication_date,
    last_publication_date: currentPost?.last_publication_date,
    uid: currentPost.uid,
    data: {
      title: currentPost.data.title,
      subtitle: currentPost.data.subtitle,
      banner: {
        url: currentPost.data.banner.url,
      },
      author: currentPost.data.author,
      content: currentPost.data.content,
    },
  };


  // The lower the index more recent is the post
  const otherPosts = [
    ...postsResponse.results.map(p => {
      return {
        uid: p.uid,
        first_publication_date: p.first_publication_date,
        title: p.data.title
      };
    }),
  ];



  const previousPost = otherPosts[currentPostIndex + 1]
    ? otherPosts[currentPostIndex + 1]
    : null;

  const nextPost = otherPosts[currentPostIndex - 1]
    ? otherPosts[currentPostIndex - 1]
    : null;

  return {
    props: {
      post,
      preview,
      previousPost,
      nextPost,
    },
  };
};
