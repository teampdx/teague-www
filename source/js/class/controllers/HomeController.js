import * as core from "../../core";



/**
 *
 * @public
 * @class HomeController
 * @param {Hobo} element The homepage module
 * @classdesc Handles homepage stuff...
 *
 */
class HomeController {
    constructor ( element ) {
        this.element = element;
        this.slices = this.element.find( ".js-slice" );
        this.index = 0;
        this.length = this.slices.length;
        this.inMotion = true;
        this.isDisabled = false;
        this._onMouseWheel = this.onMouseWheel.bind( this );
        this._onMouseWheelF = this.onMouseWheelF.bind( this );
        this._loadFunc = null;
        this._unloadFunc = null;

        this.bindWheelF();
        this.bindWheel();
        this.transition();
    }


    onMouseWheelF ( e ) {
        e.preventDefault();
        return false;
    }
    onMouseWheel ( e ) {
        if ( !this.inMotion && !this.isDisabled ) {
            this.handleWheel( e );
        }
    }
    bindWheelF () {
        core.dom.doc.on( "DOMMouseScroll mousewheel", this._onMouseWheelF );
    }
    bindWheel () {
        core.dom.doc.on( "DOMMouseScroll mousewheel", this._onMouseWheel );
    }
    unbindWheelF () {
        core.dom.doc.off( "DOMMouseScroll mousewheel", this._onMouseWheelF );
    }
    unbindWheel () {
        core.dom.doc.off( "DOMMouseScroll mousewheel", this._onMouseWheel );
    }
    handleWheel ( e ) {
        // Scroll up ( rewind )
        if ( e.deltaY < 0 ) {
            if ( this.index !== 0 ) {
                if ( this._unloadFunc ) {
                    this._unloadFunc();
                }
                this.index--;
                this.transition();
            }

        // Scroll down ( advance )
        } else if ( e.deltaY > 0 ) {
            if ( this.index !== (this.length - 1) ) {
                if ( this._unloadFunc ) {
                    this._unloadFunc();
                }
                this.index++;
                this.transition();
            }
        }
    }
    resetWheel () {
        this.bindWheel();
        this.inMotion = false;
    }


    unload () {
        this.slices.removeClass( "is-active" );
    }
    transition () {
        this.inMotion = true;
        this.unbindWheel();
        this.unload();

        const slice = this.slices.eq( this.index );
        const data = slice.data();

        this._loadFunc = this[ `${data.prop}_load` ].bind( this );
        this._unloadFunc = this[ `${data.prop}_unload` ].bind( this );
        this._loadFunc();
    }


    home_reel_load () {
        const slice = this.slices.eq( this.index ).addClass( "is-active" );
        const mark = slice.find( ".js-home-reel-mark" );
        const desc = slice.find( ".js-home-reel-desc" );
        const cta = slice.find( ".js-home-reel-cta" );
        const ex = slice.find( ".js-home-reel-ex" );
        const video = slice.find( ".js-home-reel-video" );
        const videoInstance = video.find( ".js-video" ).data().Video;

        mark.addClass( "is-full" );
        core.dom.html.removeClass( "is-theme-black" ).addClass( "is-theme-white" );

        cta.on( "click", () => {
            this.isDisabled = true;
            desc.removeClass( "is-anim" );
            cta.removeClass( "is-anim" );
            ex.addClass( "is-anim" );
            mark.removeClass( "is-half" );
            video.addClass( "is-fs" );
            videoInstance.toggleSound();
        });

        ex.on( "click", () => {
            this.isDisabled = false;
            desc.addClass( "is-anim" );
            cta.addClass( "is-anim" );
            ex.removeClass( "is-anim" );
            mark.addClass( "is-half" );
            video.removeClass( "is-fs" );

            if ( !videoInstance.isMuted ) {
                videoInstance.toggleSound();
            }
        });

        setTimeout(() => {
            mark.removeClass( "is-full" ).addClass( "is-half" );

        }, 2000 );

        setTimeout(() => {
            desc.addClass( "is-anim" );
            cta.addClass( "is-anim" );

        }, 2500 );

        setTimeout(() => {
            this.resetWheel();

        }, 3000 );
    }
    home_reel_unload () {
        const slice = this.slices.eq( this.index );
        const mark = slice.find( ".js-home-reel-mark" );
        const desc = slice.find( ".js-home-reel-desc" );
        const cta = slice.find( ".js-home-reel-cta" );
        const ex = slice.find( ".js-home-reel-ex" );
        const video = slice.find( ".js-home-reel-video" );

        desc.addClass( "is-animo" );
        cta.removeClass( "is-anim" ).off( "click" );
        ex.removeClass( "is-anim" ).off( "click" );
        mark.removeClass( "is-full is-half" );
        video.removeClass( "is-fs" );

        setTimeout(() => {
            desc.removeClass( "is-anim is-animo" );

        }, 1000 );
    }


    home_about_load () {
        const slice = this.slices.eq( this.index ).addClass( "is-active" );
        const mark = slice.find( ".js-home-about-mark" );
        const desc = slice.find( ".js-home-about-desc" );

        mark.addClass( "is-expand" );
        desc.addClass( "is-anim" );
        core.dom.html.removeClass( "is-theme-black" ).addClass( "is-theme-white" );

        setTimeout(() => {
            this.resetWheel();

        }, 2000 );
    }
    home_about_unload () {
        const slice = this.slices.eq( this.index );
        const mark = slice.find( ".js-home-about-mark" );
        const desc = slice.find( ".js-home-about-desc" );

        mark.addClass( "is-contract" );
        desc.addClass( "is-animo" );

        setTimeout(() => {
            mark.removeClass( "is-expand is-contract" );
            desc.removeClass( "is-anim is-animo" );

        }, 1000 );
    }


    home_discover_load () {
        const slice = this.slices.eq( this.index ).addClass( "is-active" );
        const desc = slice.find( ".js-home-discover-desc" );
        const mark = slice.find( ".js-home-discover-mark" );

        desc.addClass( "is-anim" );
        mark.addClass( "is-expand" );
        core.dom.html.removeClass( "is-theme-white" ).addClass( "is-theme-black" );

        setTimeout(() => {
            this.resetWheel();

        }, 2000 );
    }
    home_discover_unload () {
        const slice = this.slices.eq( this.index );
        const desc = slice.find( ".js-home-discover-desc" );
        const mark = slice.find( ".js-home-discover-mark" );

        desc.addClass( "is-animo" );
        mark.removeClass( "is-expand" );

        setTimeout(() => {
            desc.removeClass( "is-anim is-animo" );

        }, 1000 );
    }


    home_stories_load () {
        const slice = this.slices.eq( this.index ).addClass( "is-active" );
        const desc = slice.find( ".js-home-stories-desc" );

        desc.addClass( "is-anim" );
        core.dom.html.removeClass( "is-theme-white" ).addClass( "is-theme-black" );

        setTimeout(() => {
            this.resetWheel();

        }, 2000 );
    }
    home_stories_unload () {
        const slice = this.slices.eq( this.index );
        const desc = slice.find( ".js-home-stories-desc" );

        desc.removeClass( "is-anim" );
    }


    destroy () {
        this.unbindWheelF();
        this.unbindWheel();
    }
}



/******************************************************************************
 * Export
*******************************************************************************/
export default HomeController;
