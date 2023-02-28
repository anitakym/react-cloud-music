import React, {useState, useEffect, useRef, useCallback} from 'react';
import SearchBox from './../../baseUI/search-box/index';
import Scroll from './../../baseUI/scroll/index';
import { Container, ShortcutWrapper, HotKey } from './style';
import { connect } from 'react-redux';
import { getHotKeyWords, changeEnterLoading, getSuggestList } from './store/actionCreators';
import { List, ListItem, EnterLoading } from './../Singers/style';
import LazyLoad, {forceCheck} from 'react-lazyload';
import { CSSTransition } from 'react-transition-group';
import Loading from './../../baseUI/loading/index';
import MusicalNote from '../../baseUI/music-note';
import { SongItem } from '../Album/style';
import { getName } from '../../api/utils';
import { getSongDetail } from './../Player/store/actionCreators';


const Search = (props) => {
  // 组件内部
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const musicNoteRef = useRef();

  // 首先在组件中取出 redux 中的数据
  const {
    hotList, 
    enterLoading, 
    suggestList: immutableSuggestList, 
    songsCount, 
    songsList: immutableSongsList
  } = props;
  const suggestList = immutableSuggestList.toJS();
  const songsList = immutableSongsList.toJS();
  const {
    getHotKeyWordsDispatch,
    changeEnterLoadingDispatch,
    getSuggestListDispatch,
    getSongDetailDispatch
  } = props;

  // 当组件初次渲染时，我们发送 Ajax 请求拿到热门列表
  useEffect(() => {
    setShow(true);
    // 用了redux缓存
    if(!hotList.size)
      getHotKeyWordsDispatch();
      // eslint-disable-next-line
  }, []);

  // 当搜索框为空时,Search组件内
  const renderHotKey = () => {
    let list = hotList ? hotList.toJS(): [];
    return (
      <ul>
        {
          list.map(item => {
            return (
              <li className="item" key={item.first} onClick={() => setQuery(item.first)}>
                <span>{item.first}</span>
              </li>
            )
          })
        }
      </ul>
    )
  };
  
  // const renderHistoryList = () => {
  //   return (
  //     <ul>
  //       {
  //         [1,2,3,4,5,6,7,8,9,5,5,5,5,5].map(item => {
  //           return (
  //             <li  className="history_item">
  //               <span className="text">离圣诞节分厘卡士大夫将来肯定</span>
  //               <span className="icon">
  //                 <i className="iconfont icon_delete">&#xe600;</i>
  //               </span>
  //             </li>
  //           )
  //         })
  //       }
  //     </ul>
  //   )
  // }
  // 原因是Search 页面的handleQuery每次会因组件的重新渲染生成新的引用，导致SearchBox里的handleQueryDebounce也重新生成引用（debounce没有达到防抖的效果）。在两次输入时间差里handleQueryDebounce如果正好是两个不同的引用，两次输入都执行了父组件的handleQuery，然后newQuery发生改变，SearchBox里会检查到newQuery和query不同，再次触发setQuery，无限循环下去了。
  // 把Search 页面的handleQuery用useCallback包起来可以解决
  // 在函数组件中，由于memo是浅层比较props的，而函数执行会反复创建新的上下文，函数里面的变量、函数都会生成新的引用，往往需要配合useCallback或者useMemo使用，才能达到最优的效果
  // 当组件的 props 和 state 没有变化时，将跳过这次渲染。而你在函数组件内频繁声明的事件处理函数，比如 handleSubmit ，在每次渲染时都会创建一个新函数。如果把这个函数随着 props 传递给作为子组件的纯组件，则会导致纯组件的优化无效，因为每次父组件重新渲染都会带着子组件一起重新渲染。这时就轮到useCallback 出马了，使用妥当的话，子组件不会盲目跟随父组件一起重新渲染，这样的话，反复渲染子组件的成本就节省下来了
  const handleQuery = useCallback((q) => {
    console.log('handleQuerySearch')
    setQuery(q);
    if (!q) return;
    changeEnterLoadingDispatch(true);
    getSuggestListDispatch(q);
  }, []);
  /* const handleQuery = (q) => {
    console.log('handleQuerySearch1111')
    setQuery(q);
    if(!q) return;
    changeEnterLoadingDispatch(true);
    getSuggestListDispatch(q);
  } */

  const renderSingers = () => {
    let singers = suggestList.artists;
    if(!singers || !singers.length) return;
    return (
      <List>
        <h1 className="title">相关歌手</h1>
        {
          singers.map((item, index) => {
            return (
              <ListItem key={item.accountId+""+index} onClick={() => props.history.push(`/singers/${item.id}`)}>
                <div className="img_wrapper">
                  <LazyLoad placeholder={<img width="100%" height="100%" src={require('./singer.png')} alt="singer"/>}>
                    <img src={item.picUrl} width="100%" height="100%" alt="music"/>
                  </LazyLoad>
                </div>
                <span className="name">歌手: {item.name}</span>
              </ListItem>
            )
          })
        }
      </List>
    )
  };

  const renderAlbum = () => {
    let albums = suggestList.playlists;
    if(!albums || !albums.length) return;
    return (
      <List>
        <h1 className="title">相关歌单</h1>
        {
          albums.map((item, index) => {
            return (
              <ListItem key={item.accountId+""+index} onClick={() => props.history.push(`/album/${item.id}`)}>
                <div className="img_wrapper">
                  <LazyLoad placeholder={<img width="100%" height="100%" src={require('./music.png')} alt="music"/>}>
                    <img src={item.coverImgUrl} width="100%" height="100%" alt="music"/>
                  </LazyLoad>
                </div>
                <span className="name">歌单: {item.name}</span>
              </ListItem>
            )
          })
        }
      </List>
    )
  };

  const selectItem = (e, id) => {
    getSongDetailDispatch(id);
    musicNoteRef.current.startAnimation({x:e.nativeEvent.clientX, y:e.nativeEvent.clientY});
  }
  // 由于是传给子组件的方法，尽量用 useCallback 包裹，以使得在依赖未改变，始终给子组件传递的是相同的引用
  const searchBack = useCallback(() => {
    setShow(false);
  }, []);

  const renderSongs = () => {
    return (
      <SongItem style={{paddingLeft: "20px"}}> 
        {
          songsList.map(item => {
            return (
              <li key={item.id} onClick={(e) => selectItem(e, item.id)}>
                <div className="info">
                  <span>{item.name}</span>
                  <span>
                    { getName(item.artists) } - { item.album.name }
                  </span>
                </div>
              </li>
            )
          })
        }
      </SongItem>
    )
  };

  return (
    <CSSTransition 
      in={show} 
      timeout={300} 
      appear={true} 
      classNames="fly"  
      unmountOnExit
      onExited={() => props.history.goBack()}
    >
      <Container play={songsCount}>
        <div className="search_box_wrapper">
          <SearchBox back={searchBack} newQuery={query} handleQuery={handleQuery}></SearchBox>
        </div>
        <ShortcutWrapper show={!query}>
          <Scroll>
            <div>
              <HotKey>
                <h1 className="title">热门搜索</h1>
                {renderHotKey()}
              </HotKey>
              {/* <SearchHistory>
                <h1 className="title">
                  <span className="text">搜索历史</span>
                  <span className="clear">
                    <i className="iconfont">&#xe63d;</i>
                  </span>
                </h1>
                {renderHistoryList()}
              </SearchHistory> */}
            </div>
          </Scroll>
        </ShortcutWrapper>
        {/* 下面为搜索结果 */}
        <ShortcutWrapper show={query}>
          <Scroll onScorll={forceCheck}>
            <div>
              { renderSingers() }
              { renderAlbum() }
              { renderSongs() }
            </div>
          </Scroll>
        </ShortcutWrapper>
        {enterLoading? <EnterLoading><Loading></Loading></EnterLoading> : null}
        <MusicalNote ref={musicNoteRef}></MusicalNote>
      </Container>
    </CSSTransition>
  )
}


// 映射Redux全局的state到组件的props上
const mapStateToProps = (state) => ({
  hotList: state.getIn(['search', 'hotList']),
  enterLoading: state.getIn(['search', 'enterLoading']),
  suggestList: state.getIn(['search', 'suggestList']),
  songsCount: state.getIn(['player', 'playList']).size,
  songsList: state.getIn(['search', 'songsList'])
});

// 映射dispatch到props上
const mapDispatchToProps = (dispatch) => {
  return {
    getHotKeyWordsDispatch() {
      dispatch(getHotKeyWords());
    },
    changeEnterLoadingDispatch(data) {
      dispatch(changeEnterLoading(data))
    },
    getSuggestListDispatch(data) {
      dispatch(getSuggestList(data));
    },
    getSongDetailDispatch(id) {
      dispatch(getSongDetail(id));
    }
  }
};

// 将ui组件包装成容器组件
export default connect(mapStateToProps, mapDispatchToProps)(React.memo(Search));
