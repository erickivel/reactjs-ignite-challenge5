import next, { GetStaticProps } from 'next';

import Link from 'next/link';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';

import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [postsPage, setPostsPage] = useState<PostPagination>(postsPagination);

  const formattedPosts = {
    next_page: postsPagination.next_page,
    results: postsPagination.results.map(post => {
      return {
        ...post,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
      };
    }),
  };

  useEffect(() => {
    setPostsPage(formattedPosts);
  }, []);

  function handleLoadMorePosts(): void {
    let test;

    fetch(postsPagination.next_page)
      .then(response => response.json())
      .then(jsonResponse => {
        test = {
          next_page: jsonResponse.next_page,
          results: formattedPosts.results.concat(
            jsonResponse.results.map(post => {
              return {
                uid: post.uid,
                first_publication_date: format(
                  new Date(post.first_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: ptBR,
                  }
                ),
                data: {
                  title: post.data.title,
                  subtitle: post.data.subtitle,
                  author: post.data.author,
                },
              };
            })
          ),
        };

        setPostsPage(test);
      });
  }

  return (
    <main className={`${commonStyles.container} ${styles.container}`}>
      <Header />

      <div className={styles.posts}>
        {postsPage.results.map(post => (
          <Link key={post.uid} href={`/post/${post.uid}`}>
            <a>
              <strong>{post.data.title}</strong>
              <p>{post.data.subtitle}</p>
              <small>
                <div>
                  <FiCalendar color="#BBBBBB" />
                  <span>{post.first_publication_date}</span>
                </div>
                <div>
                  <FiUser color="#BBBBBB" />
                  <span>{post.data.author}</span>
                </div>
              </small>
            </a>
          </Link>
        ))}
      </div>

      {postsPage.next_page && (
        <button type="button" onClick={handleLoadMorePosts}>
          Carregar mais posts
        </button>
      )}
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: postsResponse.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    }),
  };

  return {
    props: { postsPagination },
  };
};
